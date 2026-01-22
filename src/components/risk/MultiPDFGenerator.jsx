import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function MultiPDFGenerator({ assessments }) {
  const generateMultiPDF = () => {
    const printWindow = window.open('', '_blank');
    
    const assessmentsHTML = assessments.map((assessment, index) => `
      ${index > 0 ? '<div style="page-break-before: always;"></div>' : ''}
      
      <div class="header">Risk assessment</div>
      
      <table class="metadata">
        <tr>
          <td class="label">Name of activity, event, and location</td>
          <td colspan="2">${assessment.activity_name}</td>
          <td class="label">Name of person doing this risk assessment</td>
          <td>${assessment.assessor_name || ''}</td>
        </tr>
        <tr>
          <td class="label">Date of risk assessment</td>
          <td>${assessment.assessment_date ? format(parseISO(assessment.assessment_date), 'dd/MM/yyyy') : ''}</td>
          <td class="label">Date of next review</td>
          <td colspan="2">${assessment.next_review_date ? format(parseISO(assessment.next_review_date), 'dd/MM/yyyy') : ''}</td>
        </tr>
      </table>
      
      <table class="risk-table">
        <thead>
          <tr>
            <th width="25%">
              What could go wrong?
              <span class="subtitle">What hazard have you identified?<br>What are the risks from it?</span>
            </th>
            <th width="12%">
              Who is at risk?
            </th>
            <th width="48%">
              What are you going to do about it?
              <span class="subtitle">How are the risks already controlled?<br>What extra controls are needed?<br>How will they be communicated to young people and adults and remain inclusive to all needs?</span>
            </th>
            <th width="15%">
              Review & revise
              <span class="subtitle">What has changed that needs to be thought about and controlled?</span>
            </th>
          </tr>
        </thead>
        <tbody>
          ${assessment.risks.map(risk => `
            <tr>
              <td>${risk.hazard || ''}</td>
              <td>${risk.who_at_risk || ''}</td>
              <td>${risk.controls || ''}</td>
              <td>${risk.review_notes || ''}</td>
            </tr>
          `).join('')}
          ${assessment.risks.length < 5 ? Array(5 - assessment.risks.length).fill(null).map(() => `
            <tr>
              <td style="height: 40px;">&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          `).join('') : ''}
        </tbody>
      </table>
      
      <div class="footer">
        <div>Don't forget, as part of your programme planning, you should have contingency activities in reserve just in case you can't do what was planned or you need to stop half way through. Make sure this is shared with those involved, so everyone knows how to respond. You should have risk assessed contingency activities prior to them taking place and communicated key information to those involved as with all activities.</div>
        <div style="margin-top: 8px;">
          <div class="footer-text">You can find more information in the Safety checklist for Section Volunteers and at scouts.org.uk/safety</div>
          <div>UKHQ template published November 2024</div>
        </div>
      </div>
    `).join('');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Risk Assessments - Combined</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      color: #000;
    }
    
    .header {
      background: #7413dc;
      color: white;
      padding: 8px 12px;
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .metadata {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      border: 1px solid #000;
    }
    
    .metadata td {
      border: 1px solid #000;
      padding: 5px;
      font-size: 8pt;
    }
    
    .metadata .label {
      background: #e9e9e9;
      font-weight: bold;
      width: 20%;
    }
    
    .risk-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      margin-bottom: 20px;
    }
    
    .risk-table th {
      background: #7413dc;
      color: white;
      border: 1px solid #000;
      padding: 5px;
      font-size: 8pt;
      font-weight: bold;
      text-align: left;
      vertical-align: top;
    }
    
    .risk-table th .subtitle {
      font-size: 6pt;
      font-weight: normal;
      display: block;
      margin-top: 2px;
      opacity: 0.9;
    }
    
    .risk-table td {
      border: 1px solid #000;
      padding: 5px;
      font-size: 8pt;
      vertical-align: top;
    }
    
    .footer {
      margin-top: 10px;
      margin-bottom: 30px;
      font-size: 7pt;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 5px;
    }
    
    .footer-text {
      color: #7413dc;
      font-weight: bold;
      margin-bottom: 3px;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  ${assessmentsHTML}
</body>
</html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <Button
      onClick={generateMultiPDF}
      size="sm"
      variant="outline"
      className="border-[#7413dc] text-[#7413dc] hover:bg-[#7413dc] hover:text-white"
    >
      <FileDown className="w-4 h-4 mr-2" />
      Print All PDFs
    </Button>
  );
}