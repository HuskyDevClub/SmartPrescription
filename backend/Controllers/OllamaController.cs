using System.Text;
using System.Text.Json;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using OllamaSharp;
using OllamaSharp.Models;
using OllamaSharp.Models.Chat;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OllamaController : ControllerBase
{
    private static readonly OllamaApiClient OLLAMA = new(new Uri("http://localhost:11434"));

    [HttpGet("tags")]
    public async Task<ActionResult<Model>> Tags()
    {
        try
        {
            // Fetch available local models
            var models = await OLLAMA.ListLocalModelsAsync();

            if (!models.Any()) return NotFound("No models found.");

            return Ok(models);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error fetching models: {ex.Message}");
        }
    }

    [HttpPost("extract")]
    public async Task<ActionResult<Prescription>> Extract(ImageExtractRequest req)
    {
        var message = new Message
        {
            Content =
                "Assume given image is the photo of one prescription medication label, extract following information in JSON format:\n{\"Name\": the name of the drug, \"Usage\": how to use drug, \"Frequency\": how many times per day (string), \"Note\": anything that need special attention}\nReturn your answer as a valid JSON object. Ensure all quotes are properly escaped, all brackets are balanced, and the structure is parseable.",
            Images = req.Images,
            Role = "user"
        };
        Message[] messages = [message];

        var chatRequest = new ChatRequest
        {
            Messages = messages,
            Model = req.Model,
            Format = "json"
        };
        StringBuilder result = new();
        await foreach (var stream in OLLAMA.ChatAsync(chatRequest))
            if (stream != null)
                result.Append(stream.Message.Content);

        var thePrescription = JsonSerializer.Deserialize<Prescription>(result.ToString())!;

        return thePrescription;
    }
}