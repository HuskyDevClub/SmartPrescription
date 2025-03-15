using Microsoft.AspNetCore.Mvc;
using OllamaSharp;
using OllamaSharp.Models;

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

    [HttpPost("extract/{data}")]
    public async Task<ActionResult<string>> Extract(string data)
    {
        return Ok("");
    }
}