#!/usr/bin/env bash
# deploy/scale.sh — ai-server Gunicorn 워커 수 동적 조정 (단일 서버 HPA)
#
# 사용법:
#   ./deploy/scale.sh          # 60초 간격 무한 루프
#   ./deploy/scale.sh --once   # 단발성 체크 (cron 등에서 사용)
#
# 원리:
#   docker stats 로 활성 슬롯 컨테이너의 CPU 사용률을 읽고,
#   Gunicorn 마스터에 TTIN/TTOU 시그널을 보내 워커 수를 동적으로 조정한다.
#
# 의존: docker, awk, grep, pgrep

set -euo pipefail

# ── 상수 ────────────────────────────────────────────────────────────────────
NGINX_UPSTREAM_FILE="nginx/upstream.conf"
CHECK_INTERVAL=60
CPU_SCALE_UP_THRESHOLD=70
CPU_SCALE_DOWN_THRESHOLD=30
MAX_WORKERS=8
MIN_WORKERS=2
LOG_FILE="deploy/scale.log"

# ── 유틸 ────────────────────────────────────────────────────────────────────
log() {
    local level="$1"
    shift
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [$level] $*" | tee -a "$LOG_FILE"
}

# ── 현재 활성 컨테이너명 반환 ────────────────────────────────────────────────
get_active_container() {
    if grep -q "ai-server-blue" "$NGINX_UPSTREAM_FILE" 2>/dev/null; then
        echo "ai-server-blue"
    elif grep -q "ai-server-green" "$NGINX_UPSTREAM_FILE" 2>/dev/null; then
        echo "ai-server-green"
    else
        echo "ai-server-blue"
    fi
}

# ── CPU 사용률(%) 정수값 반환 ────────────────────────────────────────────────
get_cpu_usage() {
    local container="$1"
    local cpu_str
    cpu_str=$(docker stats --no-stream --format "{{.Name}} {{.CPUPerc}}" \
        "$container" 2>/dev/null | awk '{print $2}' | tr -d '%')

    if [ -z "$cpu_str" ]; then
        echo "0"
        return
    fi
    echo "$cpu_str" | awk '{printf "%d", $1}'
}

# ── 현재 Gunicorn worker 프로세스 수 반환 ────────────────────────────────────
get_worker_count() {
    local container="$1"
    docker exec "$container" \
        sh -c "ps aux | grep -c '[g]unicorn.*worker'" 2>/dev/null || echo "0"
}

# ── Gunicorn 마스터 PID 반환 ─────────────────────────────────────────────────
get_gunicorn_master_pid() {
    local container="$1"
    docker exec "$container" \
        pgrep -f "gunicorn main:app" 2>/dev/null | head -1 || echo ""
}

# ── 워커 스케일 업 ───────────────────────────────────────────────────────────
scale_up() {
    local container="$1"
    local current_workers="$2"

    if [ "$current_workers" -ge "$MAX_WORKERS" ]; then
        log "INFO" "[$container] 워커 수 최대치 ($MAX_WORKERS) — 스케일 업 건너뜀"
        return
    fi

    local master_pid
    master_pid=$(get_gunicorn_master_pid "$container")

    if [ -z "$master_pid" ]; then
        log "WARN" "[$container] Gunicorn 마스터 PID 조회 실패"
        return
    fi

    log "INFO" "[$container] 워커 추가 (TTIN → PID $master_pid, $current_workers → $((current_workers + 1)))"
    docker exec "$container" kill -TTIN "$master_pid"
}

# ── 워커 스케일 다운 ─────────────────────────────────────────────────────────
scale_down() {
    local container="$1"
    local current_workers="$2"

    if [ "$current_workers" -le "$MIN_WORKERS" ]; then
        log "INFO" "[$container] 워커 수 최솟값 ($MIN_WORKERS) — 스케일 다운 건너뜀"
        return
    fi

    local master_pid
    master_pid=$(get_gunicorn_master_pid "$container")

    if [ -z "$master_pid" ]; then
        log "WARN" "[$container] Gunicorn 마스터 PID 조회 실패"
        return
    fi

    log "INFO" "[$container] 워커 감소 (TTOU → PID $master_pid, $current_workers → $((current_workers - 1)))"
    docker exec "$container" kill -TTOU "$master_pid"
}

# ── 단일 체크 사이클 ─────────────────────────────────────────────────────────
check_and_scale() {
    local container
    container=$(get_active_container)

    local running
    running=$(docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null || echo "false")
    if [ "$running" != "true" ]; then
        log "WARN" "[$container] 컨테이너가 실행 중이 아닙니다 — 건너뜀"
        return
    fi

    local cpu_int
    cpu_int=$(get_cpu_usage "$container")

    local worker_count
    worker_count=$(get_worker_count "$container")

    log "INFO" "[$container] CPU: ${cpu_int}%, 워커: ${worker_count}"

    if [ "$cpu_int" -gt "$CPU_SCALE_UP_THRESHOLD" ]; then
        log "INFO" "[$container] CPU ${cpu_int}% > ${CPU_SCALE_UP_THRESHOLD}% — 스케일 업"
        scale_up "$container" "$worker_count"
    elif [ "$cpu_int" -lt "$CPU_SCALE_DOWN_THRESHOLD" ]; then
        log "INFO" "[$container] CPU ${cpu_int}% < ${CPU_SCALE_DOWN_THRESHOLD}% — 스케일 다운"
        scale_down "$container" "$worker_count"
    else
        log "DEBUG" "[$container] CPU ${cpu_int}% — 워커 수 유지 ($worker_count)"
    fi
}

# ── 메인 ────────────────────────────────────────────────────────────────────
main() {
    [ -f "$NGINX_UPSTREAM_FILE" ] || {
        echo "오류: nginx/upstream.conf 없음 — 프로젝트 루트에서 실행하세요"
        exit 1
    }

    log "INFO" "HPA 모니터링 시작 (간격: ${CHECK_INTERVAL}s, CPU ↑${CPU_SCALE_UP_THRESHOLD}% ↓${CPU_SCALE_DOWN_THRESHOLD}%)"

    if [ "${1:-}" = "--once" ]; then
        check_and_scale
        return
    fi

    while true; do
        check_and_scale
        sleep "$CHECK_INTERVAL"
    done
}

main "$@"
