using System;

namespace Notifications.PoC {

    public class NotificationException : Exception {

        public NotificationException(string message) : base(message) {}

        public NotificationException(string message, Exception innerException) 
            : base(message, innerException) {} 

        public NotificationException() 
        : this("An errror occurs when try to send notification, please try again") {}
    }
}