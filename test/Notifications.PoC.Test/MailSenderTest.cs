using Moq;
using Xunit;
using Notifications.PoC.Email;
using Notifications.PoC.Request;
using System.Threading.Tasks;

namespace Notifications.PoC.Test
{
    public class MailSenderTest
    {
        private readonly MailSender _mailSender;
        private readonly Mock<IClientRequest> _smtpRequestClient;

        public MailSenderTest() 
        {
            _smtpRequestClient = new Mock<IClientRequest>();
            _mailSender = new MailSender(_smtpRequestClient.Object);
        }

        [Fact]
        public async Task Should_Send_Email()
        {
            _smtpRequestClient.Setup(x => x.Request(It.IsAny<object>())).ReturnsAsync(new NotificationResponse {
                Menssage = "Email sended with success",
                Success = true
            });

            var result = await _mailSender.SendMessage(new Message 
            {
                Body = "Test Mail",
                To = "salgadinhol@outlook.com"
            });

            Assert.True(result.Success);
            Assert.Equal("Email sended with success", result.Menssage);
        }

        [Fact]
        public async Task Should_Throws_Error()
        {
            _smtpRequestClient.Setup(x => x.Request(It.IsAny<object>()))
                .ThrowsAsync(new NotificationException("booom!"));

            await Assert.ThrowsAsync<NotificationException>(async () => {
                await _mailSender.SendMessage(new Message 
                {
                    Body = "Test Mail",
                    To = "salgadinhol@outlook.com"
                });
            });
        }
    }
}