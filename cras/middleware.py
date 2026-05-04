import time
import logging

logger = logging.getLogger("perf")


class RequestTimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info("%s %s -> %.2f ms", request.method, request.path, duration_ms)
        return response
