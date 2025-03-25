import pandas as pd
from openpyxl.styles import Font

# Define the template data
data = {
    "Website URL": ["example.com", "blog-example.com", "multi-example.com"],
    "Domain Rating": [75, 68, 72],
    "Website Traffic": [25000, 18000, 32000],
    "Type": ["guest_post", "niche_edit", "both"],
    "Guest Post Price": [350, None, 400],
    "Niche Edit Price": [None, 280, 320],
    "GP TAT (in days)": [10, None, 14],
    "NE TAT (in days)": [None, 7, 7],
    "Guidelines": ["Please provide well-researched content", "No branded anchor text", "Must be related to tech industry"]
}

# Create DataFrame and save to Excel
df = pd.DataFrame(data)

# Save to Excel with formatting
with pd.ExcelWriter("client/public/templates/domains-template.xlsx", engine="openpyxl") as writer:
    df.to_excel(writer, sheet_name="Domains Template", index=False)
    
    # Get the workbook and the worksheet
    workbook = writer.book
    worksheet = writer.sheets["Domains Template"]
    
    # Format headers
    for col_num, value in enumerate(df.columns.values):
        cell = worksheet.cell(row=1, column=col_num+1)
        cell.font = Font(bold=True)
    
    # Adjust column widths
    for idx, col in enumerate(df.columns):
        column_width = max(len(col) + 2, df[col].astype(str).map(len).max() + 2)
        worksheet.column_dimensions[chr(65 + idx)].width = column_width

print("Excel template created successfully at client/public/templates/domains-template.xlsx")