/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
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
//  * Date Created : 05-November-2026
//  *
//  * Description : This script is for an automated notification system needs to be implemented for dealer accounts that either reach or exceed the credit limit during order placement, requiring a deposit and/or payment. Additionally, notifications should be sent when the accounts surpass their credit limit. These notifications should be directed to the email addresses of the CSR.
//  * Develop a script to automatically place sales orders on hold during creation, specifically when the customer's credit limit is exceeded. Additionally, send an email notification to the designated recipients when an order is put on hold. Add an "Approve SO" button that is exclusively visible to the intended approvers for approving ON-HOLD sales orders.
//  *
//  * REVISION HISTORY
//  *
//  * @version 2.1  Corp Design-USA-NS/SCA-1 : 05-November-2026 : Created the initial build by JJ0494
//  *
//  *
//  ******************************************************************************
// *********/

define(['N/currentRecord', 'N/record'],

function(currentRecord, record) {

    function pageInit(context) {
        // Required entry point
    }

    function approveSO() {

        try {

            var rec = currentRecord.get();

            record.submitFields({
                type: record.Type.SALES_ORDER,
                id: rec.id,
                values: {
                    custbody_jj_on_hold: false
                }
            });

            alert('Sales Order Approved');

            window.location.reload();

        } catch (e) {

            alert(e.message);
        }
    }

    return {
        pageInit: pageInit,
        approveSO: approveSO
    };
});