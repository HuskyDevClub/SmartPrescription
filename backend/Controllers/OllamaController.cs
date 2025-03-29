using System.Text;
using System.Text.Json;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using OllamaSharp;
using OllamaSharp.Models.Chat;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OllamaController : ControllerBase
{
    private const string MODEL = "llama3.2-vision";

    private const string EXTRACTION_PROMPT =
        "If the given image is a photo of discharge medication orders that likely contains mutiple drugs, extract following information for every drug in the image:\n" +
        "- Name (string): The name of the drug\n" +
        "- DoseQty (int): The quanity of the does\n" +
        "- DoseUnit (string): The dose unit\n" +
        "- Route (string): The route\n" +
        "- Frequency (string): The frequency, usually in the form of three numbers (0 or 1) split by dashes\n" +
        "- Days (int): Thr number of days\n" +
        "Return your answer as a valid JSON object, with the int index as the key, the data as the value. Ensure all quotes are properly escaped, all brackets are balanced, and the structure is parseable.";

    private static readonly OllamaApiClient OLLAMA = new(new Uri("http://localhost:11434"));

    [HttpPost("extract")]
    public async Task<ActionResult<Prescription[]>> Extract(string[] images)
    {
        Message[] messages =
        [
            new()
            {
                Content = EXTRACTION_PROMPT,
                Images = images,
                Role = "user"
            }
        ];

        ChatRequest chatRequest = new()
        {
            Messages = messages,
            Model = MODEL,
            Format = "json"
        };
        StringBuilder result = new();
        await foreach (ChatResponseStream? stream in OLLAMA.ChatAsync(chatRequest))
            if (stream != null)
                result.Append(stream.Message.Content);

        Prescription[] thePrescription;

        try
        {
            thePrescription = JsonSerializer.Deserialize<Dictionary<int, Prescription>>(result.ToString())!.Values
                .ToArray();
        }
        catch (Exception e)
        {
            thePrescription = [];
            Console.WriteLine(result.ToString());
            Console.WriteLine(e);
        }

        return thePrescription;
    }
}