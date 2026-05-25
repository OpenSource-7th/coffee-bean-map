#!/usr/bin/env bash
# deploy/blue-green.sh — ai-server 블루-그린 무중단 배포
#
# 사용법:
#   ./deploy/blue-green.sh
#
# 의존:
#   - docker, docker compose v2, curl
#   - 프로젝트 루트에서 실행해야 합니다
#
# 환경변수 (옵션):
#   HEALTH_CHECK_RETRIES  헬스체크 최대 재시도 횟수 (기본 30)
#   HEALTH_CHECK_INTERVAL 재시도 간격(초) (기본 1)

set -euo pipefail

# ── 상수 ────────────────────────────────────────────────────────────────────
COMPOSE_FILE="docker-compose.prod.yml"
NGINX_UPSTREAM_FILE="nginx/upstream.conf"
NGINX_CONTAINER="coffee-bean-map-nginx-1"
BLUE_PORT=8001
GREEN_PORT=8002
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-30}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-1}"
LOG_FILE="deploy/deploy.log"

# ── 유틸 ────────────────────────────────────────────────────────────────────
log() {
    local level="$1"
    shift
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [$level] $*" | tee -a "$LOG_FILE"
}

die() {
    log "ERROR" "$*"
    exit 1
}

# ── 현재 활성 슬롯 판단 ──────────────────────────────────────────────────────
get_active_slot() {
    if grep -q "ai-server-blue" "$NGINX_UPSTREAM_FILE" 2>/dev/null; then
        echo "blue"
    elif grep -q "ai-server-green" "$NGINX_UPSTREAM_FILE" 2>/dev/null; then
        echo "green"
    else
        echo "blue"
    fi
}

# ── 헬스체크 ────────────────────────────────────────────────────────────────
wait_for_healthy() {
    local port="$1"
    local url="http://localhost:${port}/health"

    log "INFO" "헬스체크 시작: $url (최대 ${HEALTH_CHECK_RETRIES}초)"

    for i in $(seq 1 "$HEALTH_CHECK_RETRIES"); do
        local http_code
        http_code=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time 2 \
            "$url" 2>/dev/null || echo "000")

        if [ "$http_code" = "200" ]; then
            log "INFO" "헬스체크 성공 (시도 $i/${HEALTH_CHECK_RETRIES})"
            return 0
        fi

        log "DEBUG" "대기 중... (시도 $i/${HEALTH_CHECK_RETRIES}, HTTP $http_code)"
        sleep "$HEALTH_CHECK_INTERVAL"
    done

    log "ERROR" "헬스체크 타임아웃: ${HEALTH_CHECK_RETRIES}초 경과"
    return 1
}

# ── nginx upstream 갱신 ──────────────────────────────────────────────────────
switch_upstream() {
    local target_slot="$1"

    log "INFO" "nginx upstream 전환: $target_slot"

    cat > "$NGINX_UPSTREAM_FILE" <<EOF
# 자동 생성 파일 — deploy/blue-green.sh 가 관리합니다.
# 마지막 배포: $(date '+%Y-%m-%d %H:%M:%S') / 활성 슬롯: ${target_slot}
upstream ai_server_upstream {
    server ai-server-${target_slot}:8000;
}
EOF

    docker exec "$NGINX_CONTAINER" nginx -s reload
    log "INFO" "nginx upstream 전환 완료 → ai-server-${target_slot}"
}

# ── 이전 슬롯 컨테이너 종료 ──────────────────────────────────────────────────
stop_old_slot() {
    local old_slot="$1"

    log "INFO" "이전 슬롯 종료: ai-server-${old_slot}"

    if [ "$old_slot" = "green" ]; then
        docker compose -f "$COMPOSE_FILE" --profile green stop ai-server-green
        docker compose -f "$COMPOSE_FILE" --profile green rm -f ai-server-green
    else
        docker compose -f "$COMPOSE_FILE" stop ai-server-blue
    fi

    log "INFO" "이전 슬롯 종료 완료: ai-server-${old_slot}"
}

# ── 메인 ────────────────────────────────────────────────────────────────────
main() {
    log "INFO" "=========================================="
    log "INFO" "블루-그린 배포 시작"
    log "INFO" "=========================================="

    [ -f "$COMPOSE_FILE" ] || die "프로젝트 루트에서 실행하세요 ($COMPOSE_FILE 없음)"
    [ -f "$NGINX_UPSTREAM_FILE" ] || die "nginx/upstream.conf 가 없습니다"

    local active_slot
    active_slot=$(get_active_slot)
    log "INFO" "현재 활성 슬롯: $active_slot"

    local inactive_slot
    if [ "$active_slot" = "blue" ]; then
        inactive_slot="green"
    else
        inactive_slot="blue"
    fi
    log "INFO" "배포 대상(inactive) 슬롯: $inactive_slot"

    # 새 이미지 빌드
    log "INFO" "이미지 빌드 시작: ai-server-${inactive_slot}"
    if [ "$inactive_slot" = "green" ]; then
        docker compose -f "$COMPOSE_FILE" --profile green build ai-server-green
    else
        docker compose -f "$COMPOSE_FILE" build ai-server-blue
    fi
    log "INFO" "이미지 빌드 완료"

    # inactive 슬롯 기동
    log "INFO" "컨테이너 기동: ai-server-${inactive_slot}"
    if [ "$inactive_slot" = "green" ]; then
        docker compose -f "$COMPOSE_FILE" --profile green up -d ai-server-green
    else
        docker compose -f "$COMPOSE_FILE" up -d ai-server-blue
    fi

    # 헬스체크
    local inactive_port
    if [ "$inactive_slot" = "blue" ]; then
        inactive_port=$BLUE_PORT
    else
        inactive_port=$GREEN_PORT
    fi

    if ! wait_for_healthy "$inactive_port"; then
        log "ERROR" "헬스체크 실패 — 배포 중단, 기존 슬롯 유지"
        if [ "$inactive_slot" = "green" ]; then
            docker compose -f "$COMPOSE_FILE" --profile green stop ai-server-green
            docker compose -f "$COMPOSE_FILE" --profile green rm -f ai-server-green
        else
            docker compose -f "$COMPOSE_FILE" stop ai-server-blue
        fi
        die "배포 실패: ai-server-${inactive_slot} 헬스체크 타임아웃"
    fi

    # nginx upstream 전환
    switch_upstream "$inactive_slot"

    # 이전 슬롯 종료
    stop_old_slot "$active_slot"

    log "INFO" "=========================================="
    log "INFO" "배포 완료: $active_slot → $inactive_slot"
    log "INFO" "=========================================="
}

main "$@"
