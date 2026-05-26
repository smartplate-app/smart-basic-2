import { createClientFromRequest } from 'npm:@base44/sdk@0.8.29';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { rows, title } = body;

        if (!rows || !Array.isArray(rows)) {
            return Response.json({ error: 'Invalid rows data' }, { status: 400 });
        }

        const reportTitle = title ? title.replace('Labor Report - ', '') : 'Custom Range';
        
        // Add branding header to the top
        rows.unshift(
            ['SMART'],
            ['PLATE'],
            ['BASIC'],
            ['food cost app'],
            [`Report Name: Labor Report | Dates Period: ${reportTitle}`],
            []
        );

        const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
        
        if (!accessToken) {
            return Response.json({ error: 'Google Sheets connector is not configured or missing token.' }, { status: 500 });
        }

        // 1. Create Spreadsheet
        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: {
                    title: title || 'Labor Report'
                },
                sheets: [
                    {
                        properties: {
                            sheetId: 0,
                            gridProperties: {
                                frozenRowCount: 7,
                                frozenColumnCount: 1
                            }
                        }
                    }
                ]
            })
        });

        if (!createRes.ok) {
            const errBody = await createRes.text();
            throw new Error(`Failed to create spreadsheet: ${errBody}`);
        }

        const sheetData = await createRes.json();
        const spreadsheetId = sheetData.spreadsheetId;
        const spreadsheetUrl = sheetData.spreadsheetUrl;
        const sheetId = sheetData.sheets[0].properties.sheetId;

        // 2. Update values
        if (rows.length > 0) {
            const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: rows
                })
            });

            if (!updateRes.ok) {
                const errBody = await updateRes.text();
                console.error("Update spreadsheet error", errBody);
                // Even if update fails, we created the sheet, so we could still return it, 
                // but better to throw so the user knows it's incomplete.
                throw new Error(`Failed to write data to spreadsheet: ${errBody}`);
            }
            
            // 3. Format header and summary rows
            const numRows = rows.length;
            const numCols = rows[0] ? rows[0].length : 0;
            
            if (numCols > 0) {
                // Find where the summary section starts
                let summaryStartIndex = -1;
                for (let i = 0; i < rows.length; i++) {
                    if (rows[i] && rows[i].length > 0 && 
                        (String(rows[i][0]).includes('סיכום נתונים') || String(rows[i][0]).includes('Summary Data'))) {
                        summaryStartIndex = i;
                        break;
                    }
                }

                const requests = [];

                // Merge SMART Cells
                requests.push({
                    mergeCells: {
                        range: { sheetId: sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
                        mergeType: 'MERGE_ALL'
                    }
                });
                // Merge PLATE Cells
                requests.push({
                    mergeCells: {
                        range: { sheetId: sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: numCols },
                        mergeType: 'MERGE_ALL'
                    }
                });
                // Merge BASIC Cells
                requests.push({
                    mergeCells: {
                        range: { sheetId: sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: numCols },
                        mergeType: 'MERGE_ALL'
                    }
                });
                // Merge food cost app Cells
                requests.push({
                    mergeCells: {
                        range: { sheetId: sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: numCols },
                        mergeType: 'MERGE_ALL'
                    }
                });
                // Merge Report Info Cells
                requests.push({
                    mergeCells: {
                        range: { sheetId: sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: numCols },
                        mergeType: 'MERGE_ALL'
                    }
                });

                // Format SMART Row
                requests.push({
                    repeatCell: {
                        range: { sheetId: sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: numCols },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0, green: 0, blue: 0 }, // Black
                                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 14 }, // White text
                                horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE'
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                    }
                });

                // Format PLATE Row
                requests.push({
                    repeatCell: {
                        range: { sheetId: sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: numCols },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 1, green: 1, blue: 1 }, // White
                                textFormat: { foregroundColor: { red: 0, green: 0, blue: 0 }, bold: true, fontSize: 16 }, // Black text
                                horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE'
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                    }
                });

                // Format BASIC Row
                requests.push({
                    repeatCell: {
                        range: { sheetId: sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: numCols },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 1, green: 1, blue: 1 }, // White
                                textFormat: { foregroundColor: { red: 0, green: 0, blue: 0 }, bold: true, fontSize: 20 }, // Black text
                                horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE'
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                    }
                });

                // Format food cost app Row
                requests.push({
                    repeatCell: {
                        range: { sheetId: sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: numCols },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 1, green: 1, blue: 1 }, // White
                                textFormat: { foregroundColor: { red: 0.4, green: 0.4, blue: 0.4 }, fontSize: 11 }, // Gray text
                                horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE'
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                    }
                });

                // Format Report Info Row
                requests.push({
                    repeatCell: {
                        range: { sheetId: sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: numCols },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }, // Very light gray
                                textFormat: { foregroundColor: { red: 0.2, green: 0.2, blue: 0.2 }, bold: true, fontSize: 11 },
                                horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP'
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
                    }
                });

                // Format Empty Spacer Row
                requests.push({
                    repeatCell: {
                        range: { sheetId: sheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 0, endColumnIndex: numCols },
                        cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 1 } } },
                        fields: 'userEnteredFormat(backgroundColor)'
                    }
                });

                // Format Header Row (now at index 6)
                requests.push({
                    repeatCell: {
                        range: { sheetId: sheetId, startRowIndex: 6, endRowIndex: 7, startColumnIndex: 0, endColumnIndex: numCols },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 }, // Dark Gray
                                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }, // White Bold Text
                                horizontalAlignment: 'CENTER'
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                    }
                });

                // Format Summary Section if found
                if (summaryStartIndex !== -1) {
                    // Summary Title
                    requests.push({
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: summaryStartIndex,
                                endRowIndex: summaryStartIndex + 1,
                                startColumnIndex: 0,
                                endColumnIndex: numCols
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, // Light Gray
                                    textFormat: { bold: true }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)'
                        }
                    });

                    // Summary Headers
                    if (summaryStartIndex + 1 < numRows) {
                        requests.push({
                            repeatCell: {
                                range: {
                                    sheetId: sheetId,
                                    startRowIndex: summaryStartIndex + 1,
                                    endRowIndex: summaryStartIndex + 2,
                                    startColumnIndex: 0,
                                    endColumnIndex: 6 // based on the 6 columns we generate
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }, // Light Gray
                                        textFormat: { bold: true },
                                        horizontalAlignment: 'CENTER'
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                            }
                        });
                    }
                    
                    // Summary Values (bolding specific columns)
                    if (summaryStartIndex + 2 < numRows) {
                        requests.push({
                            repeatCell: {
                                range: {
                                    sheetId: sheetId,
                                    startRowIndex: summaryStartIndex + 2,
                                    endRowIndex: summaryStartIndex + 3,
                                    startColumnIndex: 0,
                                    endColumnIndex: 6
                                },
                                cell: {
                                    userEnteredFormat: {
                                        textFormat: { bold: true },
                                        horizontalAlignment: 'CENTER'
                                    }
                                },
                                fields: 'userEnteredFormat(textFormat,horizontalAlignment)'
                            }
                        });
                    }
                }
                
                // Set RTL direction
                requests.push({
                    updateSheetProperties: {
                        properties: {
                            sheetId: sheetId,
                            rightToLeft: true
                        },
                        fields: 'rightToLeft'
                    }
                });

                // Auto-resize the first column (Worker Name)
                requests.push({
                    autoResizeDimensions: {
                        dimensions: {
                            sheetId: sheetId,
                            dimension: 'COLUMNS',
                            startIndex: 0,
                            endIndex: 1
                        }
                    }
                });

                if (requests.length > 0) {
                    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            requests: requests
                        })
                    });
                }
            }
        }

        // Share with store managers
        try {
            await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId });
        } catch(e) {
            console.error('Failed to share sheet with managers:', e);
        }

        return Response.json({ success: true, url: spreadsheetUrl });

    } catch (error) {
        console.error('exportLaborReportToSheets error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});