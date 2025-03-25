import pandas as pd
from openpyxl.styles import Font, PatternFill
import os

# Create templates directory if it doesn't exist
templates_dir = "client/public/templates"
os.makedirs(templates_dir, exist_ok=True)

# Define the template data with strict adherence to domain type rules
data = {
    "Website URL": ["example.com", "blog-example.com", "multi-example.com"],
    "Domain Rating": [75, 68, 72],
    "Website Traffic": [25000, 18000, 32000],
    "Type": ["guest_post", "niche_edit", "both"],
    "Guest Post Price": [350, None, 400],  # Guest post only has GP price
    "Niche Edit Price": [None, 280, 320],  # Niche edit only has NE price
    "GP TAT (in days)": [10, None, 14],    # Guest post only has GP TAT
    "NE TAT (in days)": [None, 7, 7],      # Niche edit only has NE TAT
    "Guidelines": ["Please provide well-researched content", "No branded anchor text", "Must be related to tech industry"]
}

# Create DataFrame
df = pd.DataFrame(data)

# Save to Excel with formatting
excel_path = f"{templates_dir}/domains-template.xlsx"
with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
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

print(f"Excel template created successfully at {excel_path}")

# Save to CSV
csv_path = f"{templates_dir}/domains-template.csv"
df.to_csv(csv_path, index=False)
print(f"CSV template created successfully at {csv_path}")