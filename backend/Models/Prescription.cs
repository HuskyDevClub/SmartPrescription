using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Prescription
{
    [Required] public string Name { get; set; } = string.Empty;

    [Required] public int DoseQty { get; set; }

    [Required] public string DoseUnit { get; set; } = string.Empty;

    [Required] public string Route { get; set; } = string.Empty;

    [Required] public string Frequency { get; set; } = string.Empty;

    [Required] public int Days { get; set; }

    [Required] public DateTime CreatedAt { get; set; } = DateTime.Now;
}