import multiprocessing

workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 120
keepalive = 5

bind = "127.0.0.1:8001"

accesslog = "/var/log/bizos/access.log"
errorlog = "/var/log/bizos/error.log"
loglevel = "warning"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s %(D)s'

proc_name = "bizos-backend"

limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

graceful_timeout = 30
preload_app = True
