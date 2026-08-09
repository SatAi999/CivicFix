import json
from typing import Dict, Any

class ReportGenerator:
    def generate_html_report(self, issue: Dict[str, Any]) -> str:
        """
        Generates a beautiful print-ready HTML page representing the official Civic Issue Report.
        """
        # Format dates
        created_date = issue.get("created_at")
        if isinstance(created_date, str):
            # Parse or trim
            created_str = created_date[:19]
        elif created_date:
            created_str = created_date.strftime("%Y-%m-%d %H:%M:%S")
        else:
            created_str = "N/A"
            
        ai = issue.get("ai_analysis") or {}
        objects = ai.get("objects_detected", [])
        hazards = ai.get("hazards", [])
        reasons = issue.get("severity_reasons", [])
        
        objects_list = ", ".join(objects) if objects else "None"
        hazards_list = ", ".join(hazards) if hazards else "None"
        
        reasons_html = "".join([f"<li>{r}</li>" for r in reasons]) if reasons else "<li>No details calculated</li>"
        
        history_html = ""
        for h in issue.get("history", []):
            history_html += f"""
            <div class="timeline-item">
                <span class="date">{h.get('created_at', '')[:10]}</span>
                <strong>{h.get('status', '')}</strong>: {h.get('notes', 'No notes')} 
                <span class="user">({h.get('changed_by_username', '')})</span>
            </div>
            """
            
        location = issue.get("location") or {}
        address = location.get("address", "Not provided")
        lat = location.get("latitude", 0.0)
        lng = location.get("longitude", 0.0)
        ward = location.get("ward", "Unknown")

        severity_color = "#3b82f6" # low (blue)
        sev = issue.get("severity", "MEDIUM")
        if sev == "MEDIUM":
            severity_color = "#eab308" # yellow
        elif sev == "HIGH":
            severity_color = "#f97316" # orange
        elif sev == "CRITICAL":
            severity_color = "#ef4444" # red

        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>CivicFix Report - {issue.get('id')}</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    color: #1e293b;
                    margin: 0;
                    padding: 40px;
                    background: #ffffff;
                }}
                .header {{
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 20px;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    color: #0f172a;
                }}
                .header .logo {{
                    font-weight: bold;
                    font-size: 24px;
                    color: #2563eb;
                }}
                .badge {{
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 4px;
                    color: white;
                    font-weight: bold;
                    font-size: 14px;
                }}
                .meta-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 25px;
                }}
                .meta-table td {{
                    padding: 12px;
                    border: 1px solid #e2e8f0;
                }}
                .meta-table td.label {{
                    font-weight: bold;
                    background: #f8fafc;
                    width: 25%;
                }}
                .section {{
                    margin-top: 30px;
                }}
                .section h2 {{
                    font-size: 18px;
                    color: #0f172a;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 8px;
                }}
                .ai-reasons {{
                    padding-left: 20px;
                    line-height: 1.6;
                }}
                .timeline-item {{
                    padding: 10px 0;
                    border-left: 2px solid #e2e8f0;
                    padding-left: 15px;
                    position: relative;
                }}
                .timeline-item::before {{
                    content: '';
                    position: absolute;
                    left: -6px;
                    top: 15px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #2563eb;
                }}
                .timeline-item .date {{
                    font-size: 12px;
                    color: #64748b;
                    margin-right: 10px;
                }}
                .timeline-item .user {{
                    font-size: 12px;
                    color: #64748b;
                }}
                .footer {{
                    margin-top: 50px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 15px;
                    font-size: 12px;
                    color: #64748b;
                    text-align: center;
                }}
                @media print {{
                    body {{ padding: 0; }}
                    .no-print {{ display: none; }}
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>CIVIC ISSUE REPORT</h1>
                    <div style="margin-top: 5px; color: #64748b;">Ticket ID: <strong>{issue.get('id')}</strong></div>
                </div>
                <div class="logo">CivicFix</div>
            </div>
            
            <table class="meta-table">
                <tr>
                    <td class="label">Title</td>
                    <td>{issue.get('title')}</td>
                    <td class="label">Status</td>
                    <td><strong>{issue.get('status')}</strong></td>
                </tr>
                <tr>
                    <td class="label">Category</td>
                    <td>{issue.get('category_name', 'N/A')}</td>
                    <td class="label">Priority / Severity</td>
                    <td>
                        <span class="badge" style="background: {severity_color};">{sev}</span>
                    </td>
                </tr>
                <tr>
                    <td class="label">Reported By</td>
                    <td>{issue.get('reporter_username')}</td>
                    <td class="label">Created Date</td>
                    <td>{created_str}</td>
                </tr>
                <tr>
                    <td class="label">Approximate Address</td>
                    <td colspan="3">{address} (Ward: {ward})</td>
                </tr>
                <tr>
                    <td class="label">Geographic Coords</td>
                    <td colspan="3">Latitude: {lat}, Longitude: {lng}</td>
                </tr>
            </table>

            <div class="section">
                <h2>Description</h2>
                <p style="white-space: pre-wrap; line-height: 1.5;">{issue.get('description', 'No description provided')}</p>
            </div>

            <div class="section">
                <h2>AI Engine Evidence Observations</h2>
                <table class="meta-table">
                    <tr>
                        <td class="label">Confidence Score</td>
                        <td>{int((ai.get('confidence') or 0.0) * 100)}%</td>
                    </tr>
                    <tr>
                        <td class="label">Objects Detected</td>
                        <td>{objects_list}</td>
                    </tr>
                    <tr>
                        <td class="label">Visible Hazards</td>
                        <td>{hazards_list}</td>
                    </tr>
                    <tr>
                        <td class="label">Reasoning Description</td>
                        <td>{ai.get('reasoning', 'N/A')}</td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2>Priority Determination Factors</h2>
                <ul class="ai-reasons">
                    {reasons_html}
                </ul>
            </div>

            <div class="section">
                <h2>Lifecycle Activity Log</h2>
                <div style="margin-top: 15px;">
                    {history_html or 'No updates logged.'}
                </div>
            </div>

            <div class="footer">
                This document is generated automatically by CivicFix. An AI-powered civic resolution platform.
                <br>
                <span class="no-print" style="margin-top: 10px; display: inline-block;">
                    <button onclick="window.print()" style="padding: 6px 12px; cursor: pointer;">Print Report</button>
                </span>
            </div>
        </body>
        </html>
        """
        return html_template

report_generator = ReportGenerator()
