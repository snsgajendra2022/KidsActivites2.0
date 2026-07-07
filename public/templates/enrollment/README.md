# Printable Enrollment Form Templates

Background images for the 5-page printable enrollment form.

## Source

Converted from `kidzee enrollment form.pdf` at 300 DPI using:

```bash
pdftoppm -png -r 300 "kidzee enrollment form.pdf" page
```

Output files: `page-1.png` through `page-5.png` (A4 portrait, ~2480×3509 px).

## Calibration

Field coordinates live in `src/enrollment/printTemplate/enrollmentPrintFields.js`.

1. Open `/enrollment/printable-form` (or `/{tenant}/enrollment/printable-form`).
2. Enable **Show Alignment Grid**.
3. Type sample data and compare field positions against the background PNG.
4. Adjust `x`, `y`, `w`, `h` values (percentages) in `enrollmentPrintFields.js`.
5. Print → Save as PDF and compare side-by-side with the original PDF.

## Replacing backgrounds

To use updated scans or a tenant-specific form, replace the PNG files here (keep filenames and A4 aspect ratio).
