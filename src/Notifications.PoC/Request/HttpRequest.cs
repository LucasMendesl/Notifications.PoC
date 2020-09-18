using RestSharp;
using System.Threading.Tasks;

namespace Notifications.PoC.Request
{
    class HttpRequest : IClientRequest
    {
        private readonly IRestClient _restClient;

        public HttpRequest(string host) 
        {
            _restClient = new RestClient(host);
        }

        public HttpRequest(string host, string apiKey) 
            : this(host)
        {
            _restClient.AddDefaultHeader("Authorization", $"Basic {apiKey}");
        } 

        public async Task<object> Request(object request)
        {
            return await _restClient.ExecuteAsync((RestRequest)request);
        }
    }
}