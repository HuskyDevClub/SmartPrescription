using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class ImageExtractRequest
{
    [Required] public string Model { get; set; } = string.Empty;

    [Required] public string[] Images { get; set; } = [];
}