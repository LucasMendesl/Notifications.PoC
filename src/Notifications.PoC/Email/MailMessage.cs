namespace Notifications.PoC.Email
{
    public class MailMessage : Message
    {
        public string From { get; set; }
        public string Subject { get; set; }
        public string[] Copy { get; set; }
        public string[] HiddenCopy { get; set; }        
    }
}