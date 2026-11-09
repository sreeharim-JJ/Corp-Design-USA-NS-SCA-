/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
// /******************************************************************************
// ********
//  * Corp Design-USA-NS/SCA
//  *
//  * ${OTP10741}: ${DEV | OTP |HOLD sales orders (Credit limit automated notifications)}
//  *
//  *
//  ******************************************************************************
// ********
//  *
//  * Author: Jobin and Jismi IT Services
//  *
//  * Date Created : 06-November-2026
//  *
//  * Description : This script is for an automated notification system needs to be implemented for dealer accounts that either reach or exceed the credit limit during order placement, requiring a deposit and/or payment. Additionally, notifications should be sent when the accounts surpass their credit limit. These notifications should be directed to the email addresses of the CSR.
//  * Develop a script to automatically place sales orders on hold during creation, specifically when the customer's credit limit is exceeded. Additionally, send an email notification to the designated recipients when an order is put on hold. Add an "Approve SO" button that is exclusively visible to the intended approvers for approving ON-HOLD sales orders.
//  *
//  * REVISION HISTORY
//  *
//  * @version 2.1  Corp Design-USA-NS/SCA-1 : 06-November-2026 : Created the initial build by JJ0494
//  *
//  *
//  ******************************************************************************
// *********/

define(['N/ui/serverWidget','N/search','N/record','N/redirect','N/log'],
     function (serverWidget, search, record, redirect, log) {
    function onRequest(context) {
        try {
            log.audit({
                title: 'Bulk Approval Suitelet',
                details: 'Request Method: ' + context.request.method
            });

            if (context.request.method === 'GET') {

                const form = serverWidget.createForm({
                    title: 'Bulk Approval of ON-HOLD Sales Orders'
                });

                const sublist = form.addSublist({
                    id: 'custpage_orders',
                    type: serverWidget.SublistType.LIST,
                    label: 'ON-HOLD Sales Orders'
                });

                sublist.addMarkAllButtons();

                sublist.addField({
                    id: 'custpage_select',
                    type: serverWidget.FieldType.CHECKBOX,
                    label: 'Select'
                });

                sublist.addField({
                    id: 'custpage_soid',
                    type: serverWidget.FieldType.TEXT,
                    label: 'SO Internal ID'
                });

                sublist.addField({
                    id: 'custpage_sonum',
                    type: serverWidget.FieldType.TEXT,
                    label: 'SO Number'
                });

                sublist.addField({
                    id: 'custpage_customer',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Customer'
                });
                

                const soSearch = search.create({
   type: "salesorder",
   settings:[{"name":"consolidationtype","value":"ACCTTYPE"},{"name":"includeperiodendtransactions","value":"F"}],
   filters:
   [
      ["mainline","is","T"], 
      "AND", 
      ["type","anyof","SalesOrd"], 
      "AND", 
      ["custbody_jj_on_hold","is","T"]
   ],
   columns:
   [
      search.createColumn({name: "entity", label: "Name"}),
      search.createColumn({name: "tranid", label: "Document Number"}),
      search.createColumn({name: "internalid", label: "Internal ID"}),
      search.createColumn({name: "amount", label: "Amount"})
   ]
});

                let line = 0;

                soSearch.run().each(function (result) {

                    try {

                        sublist.setSublistValue({
                            id: 'custpage_soid',
                            line: line,
                            value: result.getValue('internalid').toString()
                        });

                        sublist.setSublistValue({
                            id: 'custpage_sonum',
                            line: line,
                            value: result.getValue('tranid')
                        });

                        sublist.setSublistValue({
                            id: 'custpage_customer',
                            line: line,
                            value: result.getText('entity')
                        });

                        line++;

                        return true;

                    } catch (e) {

                        log.error({
                            title: 'Error Loading Search Result',
                            details: e
                        });

                        return true;
                    }
                });

                log.debug({
                    title: 'Orders Loaded',
                    details: 'Total Orders Found: ' + line
                });

                form.addSubmitButton({
                    label: 'Approve Selected Orders'
                });

                context.response.writePage(form);

            } else {

                try {

                    const lineCount = context.request.getLineCount({
                        group: 'custpage_orders'
                    });

                    log.audit({
                        title: 'Bulk Approval Started',
                        details: 'Line Count: ' + lineCount
                    });

                    const approvedCount = 0;

                    for (let i = 0; i < lineCount; i++) {

                        const selected = context.request.getSublistValue({
                            group: 'custpage_orders',
                            name: 'custpage_select',
                            line: i
                        });

                        if (selected === 'T') {

                            const soId = context.request.getSublistValue({
                                group: 'custpage_orders',
                                name: 'custpage_soid',
                                line: i
                            });

                            try {

                                record.submitFields({
                                    type: record.Type.SALES_ORDER,
                                    id: soId,
                                    values: {
                                        custbody_jj_on_hold: false
                                    }
                                });

                                approvedCount++;

                                log.audit({
                                    title: 'Sales Order Approved',
                                    details: 'SO Internal ID: ' + soId
                                });

                            } catch (approveErr) {

                                log.error({
                                    title: 'Approval Failed - SO ' + soId,
                                    details: approveErr
                                });
                            }
                        }
                    }

                    log.audit({
                        title: 'Bulk Approval Completed',
                        details: approvedCount + ' orders approved.'
                    });

                    redirect.toSuitelet({
                        scriptId: 'customscript_jj_sl_hold_salesorder',
                        deploymentId: 'customdeploy_jj_sl_hold_salesorder'
                    });

                } catch (postErr) {

                    log.error({
                        title: 'POST Processing Error',
                        details: postErr
                    });

                    throw postErr;
                }
            }

        } catch (e) {

            log.error({
                title: 'Suitelet Error',
                details: JSON.stringify(e)
            });

            context.response.write(
                '<h3>Error Occurred</h3><br/>' +
                e.name + ' : ' + e.message
            );
        }
    }

    return {
        onRequest: onRequest
    };

});