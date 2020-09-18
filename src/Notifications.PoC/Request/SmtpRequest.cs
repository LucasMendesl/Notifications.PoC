using System.Net;
using System.Linq;
using System.Net.Mail;
using System.Threading.Tasks;
using System;

namespace Notifications.PoC.Request
{
    public class SmtpRequest : IClientRequest
    {
        private readonly SmtpClient _smtpClient;

        public SmtpRequest(string user, string password, int port, string host, bool useSSL) => _smtpClient = new SmtpClient
        {
            EnableSsl = useSSL,
            Host = host,
            Port = port,
            UseDefaultCredentials = false,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Credentials = new NetworkCredential(user, password)
        };

        public async Task<object> Request(object request)
        {
            try 
            {
                var message = request as Email.MailMessage;
                var mailMessage = new MailMessage 
                {
                    From = new MailAddress(message.From),
                    IsBodyHtml = true,
                    Body = message.Body,
                    Subject = message.Subject,                    
                };

                message.Copy.ToList().ForEach(mailMessage.CC.Add);
                message.HiddenCopy.ToList().ForEach(mailMessage.Bcc.Add);  

                mailMessage.To.Add(message.To);
                await _smtpClient.SendMailAsync(mailMessage);

                return new NotificationResponse 
                {
                    Success = true,
                    Menssage = "Email sended with success"
                };
            }
            catch (Exception ex) 
            {
                throw new NotificationException("An error occurs when try to send email", ex);
            } 
        }
    }
}