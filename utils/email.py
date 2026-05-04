import logging
import threading

from django.core.mail import send_mail
from django.utils.html import format_html


logger = logging.getLogger(__name__)


def rec_send_email(email, subject, message, html, sender):
    try:
        result = send_mail(
            str(subject),
            format_html(message),
            sender,
            [email],
            fail_silently=False,
            html_message=html,
        )
        logger.info("Email enviado para %s: %s", email, result)
    except Exception:
        logger.exception(
            "Falha ao enviar email. sender=%s recipient=%s subject=%s",
            sender,
            email,
            subject,
        )


def send_email_in_thread(email, subject, message, html, sender):
    t1 = threading.Thread(
        target=rec_send_email,
        args=[email, subject, message, html, sender],
        daemon=True,
    )
    t1.start()
