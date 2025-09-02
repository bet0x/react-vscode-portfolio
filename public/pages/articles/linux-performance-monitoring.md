---
title: "Linux Performance Monitoring: Essential Tools and Techniques"
date: "2023-03-15"
tags: ["linux", "performance", "monitoring", "sysadmin", "troubleshooting"]
summary: "A comprehensive guide to Linux performance monitoring tools and techniques for system administrators and engineers."
author: "Alberto Ferrer"
slug: "linux-performance-monitoring"
---

# Linux Performance Monitoring: Essential Tools and Techniques

After 25+ years working with Linux systems, I've learned that effective performance monitoring is crucial for maintaining healthy infrastructure. This guide covers the essential tools and methodologies I use daily for performance analysis and troubleshooting.

## System Overview Tools

### htop - Enhanced Process Viewer

While `top` is universal, `htop` provides a much better user experience:

```bash
sudo apt install htop
htop
```

**Key features:**
- Color-coded CPU and memory usage
- Tree view of processes
- Easy process killing with F9
- Search functionality with F3

### iotop - I/O Monitoring

For disk I/O analysis:

```bash
sudo apt install iotop
sudo iotop -o  # Only show processes with I/O activity
```

### nethogs - Network Per-Process Monitor

Monitor network usage by process:

```bash
sudo apt install nethogs
sudo nethogs
```

## CPU Performance Analysis

### CPU Utilization Patterns

```bash
# Real-time CPU usage per core
mpstat 1

# CPU usage with process breakdown
pidstat -u 1

# Load average trends
uptime && cat /proc/loadavg
```

### Finding CPU Intensive Processes

```bash
# Top CPU consumers
ps aux --sort=-%cpu | head -20

# Real-time monitoring
watch -n 1 'ps aux --sort=-%cpu | head -10'
```

## Memory Analysis

### Memory Usage Breakdown

```bash
# Detailed memory information
free -h && cat /proc/meminfo | grep -E "(MemTotal|MemFree|MemAvailable|Buffers|Cached)"

# Memory usage by process
ps aux --sort=-%mem | head -20

# System memory map
cat /proc/iomem
```

### Memory Leak Detection

```bash
# Monitor memory usage over time
while true; do
    echo "$(date): $(free -m | grep '^Mem:' | awk '{print $3}') MB used"
    sleep 60
done
```

## Disk I/O Performance

### iostat - I/O Statistics

```bash
# Install if not available
sudo apt install sysstat

# I/O statistics every 2 seconds
iostat -x 2

# Focus on specific devices
iostat -x 2 /dev/sda /dev/nvme0n1
```

### iotop for Process-Level I/O

```bash
# Show only active I/O processes
sudo iotop -a -o

# Show accumulated I/O
sudo iotop -a
```

### Disk Space Analysis

```bash
# Disk usage by filesystem
df -h

# Find large directories
du -sh /* 2>/dev/null | sort -rh | head -10

# Find large files
find / -type f -size +100M 2>/dev/null | head -20
```

## Network Performance

### Network Interface Statistics

```bash
# Interface statistics
cat /proc/net/dev

# Real-time network usage
iftop

# Network connections
ss -tuln  # Modern replacement for netstat
```

### Bandwidth Monitoring

```bash
# Install monitoring tools
sudo apt install vnstat iftop

# Historical bandwidth data
vnstat -i eth0

# Real-time bandwidth per connection
sudo iftop -i eth0
```

## System Calls and Process Monitoring

### strace - System Call Tracer

```bash
# Trace system calls for a process
strace -p <PID>

# Trace file operations
strace -e trace=file ls

# Count system calls
strace -c ls
```

### lsof - List Open Files

```bash
# Files opened by a process
lsof -p <PID>

# Processes using a file
lsof /var/log/syslog

# Network connections by process
lsof -i
```

## Advanced Monitoring with Custom Scripts

### System Health Check Script

```bash
#!/bin/bash
# system_health.sh

echo "=== System Health Check $(date) ==="
echo

echo "CPU Load:"
uptime
echo

echo "Memory Usage:"
free -h
echo

echo "Disk Usage:"
df -h | grep -vE '^Filesystem|tmpfs|cdrom'
echo

echo "Top 5 CPU Processes:"
ps aux --sort=-%cpu | head -6
echo

echo "Top 5 Memory Processes:"
ps aux --sort=-%mem | head -6
echo

echo "Network Connections:"
ss -tuln | wc -l
echo
```

### Automated Performance Logging

```bash
#!/bin/bash
# performance_logger.sh

LOG_FILE="/var/log/performance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

{
    echo "[$DATE] Performance Metrics"
    echo "Load: $(cat /proc/loadavg)"
    echo "Memory: $(free | grep '^Mem:' | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
    echo "Disk: $(df / | tail -1 | awk '{print $5}')"
    echo "---"
} >> $LOG_FILE
```

## Performance Tuning Tips

### 1. I/O Scheduler Optimization

```bash
# Check current I/O scheduler
cat /sys/block/sda/queue/scheduler

# Change to deadline for SSDs
echo deadline | sudo tee /sys/block/sda/queue/scheduler
```

### 2. Memory Management

```bash
# Adjust swappiness (0-100, lower = less swap usage)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# Clear page cache (be careful!)
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
```

### 3. Network Tuning

```bash
# Increase network buffer sizes
echo 'net.core.rmem_max = 16777216' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' | sudo tee -a /etc/sysctl.conf
```

## Monitoring Automation

### Setting Up Continuous Monitoring

```bash
# Add to crontab for regular health checks
crontab -e

# Add this line to run every 5 minutes
*/5 * * * * /usr/local/bin/system_health.sh >> /var/log/system_health.log 2>&1
```

### Log Rotation

```bash
# Configure logrotate for performance logs
cat << EOF | sudo tee /etc/logrotate.d/performance
/var/log/performance.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 root root
}
EOF
```

## Conclusion

Effective Linux performance monitoring requires a combination of real-time tools and historical analysis. The key is to:

1. **Establish baselines** - Know what normal looks like
2. **Monitor proactively** - Don't wait for problems
3. **Use the right tool** - Different scenarios need different approaches
4. **Automate routine checks** - Let scripts handle repetitive monitoring

Remember: monitoring is not just about finding problems, but preventing them. A well-monitored system is a reliable system.

## Further Reading

- [Linux Performance Tools by Brendan Gregg](http://www.brendangregg.com/linuxperf.html)
- [Understanding Linux Load Averages](https://www.brendangregg.com/blog/2017-08-08/linux-load-averages.html)
- [Linux Performance Analysis in 60 Seconds](https://medium.com/netflix-techblog/linux-performance-analysis-in-60-000-milliseconds-accc10403c55)
