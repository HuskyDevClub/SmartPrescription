using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Prescription
{
    [Required] public string Name { get; set; } = string.Empty;

    [Required] public string Usage { get; set; } = string.Empty;

    [Required] public int Qty { get; set; }

    [Required] public int Refills { get; set; }

    [Required] public string Discard { get; set; } = string.Empty;

    [Required] public string Note { get; set; } = string.Empty;
}