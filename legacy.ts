// payment_system.ts
// Extremely insecure legacy payment system in TypeScript (Node.js)
// Educational bad code example - full of SQL injection, plain text secrets, code duplication, etc.
// Uses 'pg' library with raw queries only (no prepared statements)

import { Client } from 'pg';
import * as fs from 'fs';

const DB_HOST = 'localhost';
const DB_PORT = 5432;
const DB_NAME = 'payment_legacy_db';
const DB_USER = 'postgres';
const DB_PASS = 'SuperSecret123!';
const SITE_SECRET = 'myglobalsecret123';

let GLOBAL_CLIENT: Client | null = null;

async function getClient(): Promise<Client> {
    if (!GLOBAL_CLIENT) {
        const connString = `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
        GLOBAL_CLIENT = new Client({ connectionString: connString });
        await GLOBAL_CLIENT.connect();
        await GLOBAL_CLIENT.query("SET client_encoding = 'UTF8';");
    }
    return GLOBAL_CLIENT;
}

async function register_customer(username: string, email: string, password: string, full_name: string, phone: string = '', country: string = 'RS', city: string = '', address: string = '') {
    const client = await getClient();
    const id = 'cust_' + Date.now() + Math.random().toString(36).substring(2);
    const sql = `INSERT INTO customers (
        id, username, email, password, full_name, phone, country, city, address_line_1,
        created_at, updated_at, register_ip, user_agent, is_admin, role_name
    ) VALUES (
        '${id}',
        '${username}',
        '${email}',
        '${password}',
        '${full_name}',
        '${phone}',
        '${country}',
        '${city}',
        '${address}',
        NOW()::text,
        NOW()::text,
        '127.0.0.1',
        'TS-LEGACY',
        'false',
        'customer'
    ) RETURNING id;`;
    try {
        const result = await client.query(sql);
        console.log("Customer registered ID: " + result.rows[0].id);
        return result.rows[0].id;
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        return null;
    }
}

async function login_customer(username: string, password: string) {
    const client = await getClient();
    const sql = `SELECT * FROM customers WHERE username = '${username}' AND password = '${password}' LIMIT 1;`;
    try {
        const result = await client.query(sql);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const session_token = require('crypto').createHash('md5').update(user.id + Date.now() + SITE_SECRET + Math.random()).digest('hex');
            const update = `UPDATE customers SET session_token = '${session_token}', last_login_ip = '127.0.0.1', failed_login_count = '0', updated_at = NOW()::text WHERE id = '${user.id}';`;
            await client.query(update);
            console.log("LOGIN SUCCESS Session: " + session_token);
            return session_token;
        }
        const fail_sql = `UPDATE customers SET failed_login_count = (failed_login_count::int + 1)::text WHERE username = '${username}';`;
        await client.query(fail_sql);
        console.log("LOGIN FAILED");
        return null;
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        return null;
    }
}

async function get_customer(customer_id: string) {
    const client = await getClient();
    const sql = `SELECT * FROM customers WHERE id = '${customer_id}' LIMIT 1;`;
    try {
        const result = await client.query(sql);
        return result.rows[0] || null;
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        return null;
    }
}

async function update_customer_profile(customer_id: string, new_email: string, new_phone: string, new_address: string) {
    const client = await getClient();
    const sql = `UPDATE customers SET email = '${new_email}', phone = '${new_phone}', address_line_1 = '${new_address}', updated_at = NOW()::text WHERE id = '${customer_id}';`;
    try {
        await client.query(sql);
        console.log("Customer profile updated");
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function reset_password(email: string, new_password: string) {
    const client = await getClient();
    const sql = `UPDATE customers SET password = '${new_password}', reset_token = 'reset_' || md5(NOW()::text), reset_token_expires_at = (NOW() + INTERVAL '1 day')::text WHERE email = '${email}';`;
    try {
        await client.query(sql);
        console.log("Password reset token generated for " + email);
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function verify_email(token: string) {
    const client = await getClient();
    const sql = `UPDATE customers SET email_verification_token = NULL WHERE email_verification_token = '${token}';`;
    try {
        await client.query(sql);
        console.log("Email verified with token " + token);
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function add_payment_method(customer_id: string, type: string, card_number: string, expiry_month: string, expiry_year: string, cvv: string, holder_name: string, iban: string = '') {
    const client = await getClient();
    const id = 'pm_' + Date.now() + Math.random().toString(36).substring(2);
    const sql = `INSERT INTO payment_methods (
        id, customer_id, type, provider, card_number, card_expiry_month, card_expiry_year, 
        card_cvv, card_holder_name, iban, active_flag, created_at, updated_at
    ) VALUES (
        '${id}',
        '${customer_id}',
        '${type}',
        'legacy_bank_gateway',
        '${card_number}',
        '${expiry_month}',
        '${expiry_year}',
        '${cvv}',
        '${holder_name}',
        '${iban}',
        'true',
        NOW()::text,
        NOW()::text
    ) RETURNING id;`;
    try {
        const result = await client.query(sql);
        console.log("Payment method added ID: " + result.rows[0].id);
        return result.rows[0].id;
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        return null;
    }
}

async function list_payment_methods(customer_id: string) {
    const client = await getClient();
    const sql = `SELECT * FROM payment_methods WHERE customer_id = '${customer_id}' AND deleted_at IS NULL;`;
    try {
        const result = await client.query(sql);
        return result.rows;
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        return [];
    }
}

async function delete_payment_method(pm_id: string) {
    const client = await getClient();
    const sql = `UPDATE payment_methods SET deleted_at = NOW()::text WHERE id = '${pm_id}';`;
    try {
        await client.query(sql);
        console.log("Payment method deleted");
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function process_payment(customer_id: string, payment_method_id: string, amount: string, currency: string = 'EUR', external_order_id: string | null = null, ip: string | null = null) {
    const client = await getClient();
    const id = 'pay_' + Date.now() + Math.random().toString(36).substring(2);
    const realIp = ip || '127.0.0.1';
    const extOrder = external_order_id || 'ord_' + Date.now();
    const raw_payload = JSON.stringify({
        card_number: '****4242',
        provider_secret: 'sk_live_9876543210abcdef',
        cvv_used: '123',
        '3ds_password': 'customer123'
    });
    const sql = `INSERT INTO payments (
        id, customer_id, payment_method_id, external_order_id, amount, currency, status,
        provider_ref, ip_address, raw_provider_payload, created_at, paid_at, captured_flag
    ) VALUES (
        '${id}',
        '${customer_id}',
        '${payment_method_id}',
        '${extOrder}',
        '${amount}',
        '${currency}',
        'captured',
        'prov_' + ${Date.now()},
        '${realIp}',
        '${raw_payload.replace(/'/g, "''")}',
        NOW()::text,
        NOW()::text,
        'true'
    ) RETURNING id;`;
    try {
        const result = await client.query(sql);
        const pay_id = result.rows[0].id;
        const update = `UPDATE customers SET total_paid = (COALESCE(total_paid::numeric, 0) + ${amount})::text WHERE id = '${customer_id}';`;
        await client.query(update);
        const log_sql = `INSERT INTO payment_logs (
            id, payment_id, customer_id, log_level, message, payload, created_at,
            actor_email, source
        ) VALUES (
            'log_' || nextval('payment_logs_id_seq'::regclass),
            '${pay_id}',
            '${customer_id}',
            'INFO',
            'Payment captured successfully',
            '${raw_payload.replace(/'/g, "''")}',
            NOW()::text,
            'system@legacy.com',
            'legacy_core'
        );`;
        await client.query(log_sql);
        console.log("PAYMENT PROCESSED ID: " + pay_id + " Amount: " + amount + " " + currency);
        return pay_id;
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        return null;
    }
}

async function list_payments(customer_id: string) {
    const client = await getClient();
    const sql = `SELECT * FROM payments WHERE customer_id = '${customer_id}' ORDER BY created_at DESC;`;
    try {
        const result = await client.query(sql);
        return result.rows;
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        return [];
    }
}

async function get_payment_details(payment_id: string) {
    const client = await getClient();
    const sql = `SELECT * FROM payments WHERE id = '${payment_id}' LIMIT 1;`;
    try {
        const result = await client.query(sql);
        return result.rows[0] || null;
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        return null;
    }
}

async function create_refund(payment_id: string, amount: string, reason: string = 'customer request') {
    const client = await getClient();
    const id = 'ref_' + Date.now() + Math.random().toString(36).substring(2);
    const sql = `INSERT INTO refunds (
        id, payment_id, amount, currency, status, reason, created_at
    ) VALUES (
        '${id}',
        '${payment_id}',
        '${amount}',
        'EUR',
        'pending',
        '${reason}',
        NOW()::text
    ) RETURNING id;`;
    try {
        await client.query(sql);
        console.log("Refund created for payment " + payment_id);
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function process_refund(refund_id: string) {
    const client = await getClient();
    const sql = `UPDATE refunds SET status = 'processed', processed_at = NOW()::text WHERE id = '${refund_id}';`;
    try {
        await client.query(sql);
        console.log("Refund processed ID: " + refund_id);
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function simulate_chargeback(payment_id: string, amount: string, reason: string = 'fraud') {
    const client = await getClient();
    const id = 'cb_' + Date.now() + Math.random().toString(36).substring(2);
    const sql = `INSERT INTO chargebacks (
        id, payment_id, amount, currency, reason, status, created_at, deadline_at
    ) VALUES (
        '${id}',
        '${payment_id}',
        '${amount}',
        'EUR',
        '${reason}',
        'open',
        NOW()::text,
        (NOW() + INTERVAL '7 days')::text
    ) RETURNING id;`;
    try {
        await client.query(sql);
        console.log("Chargeback created for payment " + payment_id);
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function resolve_chargeback(chargeback_id: string, won: string = 'true') {
    const client = await getClient();
    const sql = `UPDATE chargebacks SET status = 'closed', won_flag = '${won}', closed_at = NOW()::text WHERE id = '${chargeback_id}';`;
    try {
        await client.query(sql);
        console.log("Chargeback resolved ID: " + chargeback_id);
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function create_fraud_review(payment_id: string, customer_id: string, score: string = '85') {
    const client = await getClient();
    const id = 'fraud_' + Date.now() + Math.random().toString(36).substring(2);
    const sql = `INSERT INTO fraud_reviews (
        id, payment_id, customer_id, score, decision, created_at
    ) VALUES (
        '${id}',
        '${payment_id}',
        '${customer_id}',
        '${score}',
        'pending',
        NOW()::text
    ) RETURNING id;`;
    try {
        await client.query(sql);
        console.log("Fraud review created for payment " + payment_id);
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function decide_fraud_review(review_id: string, decision: string, reviewer_email: string, reviewer_password: string) {
    const client = await getClient();
    const check = `SELECT * FROM customers WHERE email = '${reviewer_email}' AND password = '${reviewer_password}' AND is_admin = 'true';`;
    try {
        const res = await client.query(check);
        if (res.rows.length === 0) {
            console.log("Fraud review access denied");
            return false;
        }
        const sql = `UPDATE fraud_reviews SET decision = '${decision}', reviewer = '${reviewer_email}', updated_at = NOW()::text WHERE id = '${review_id}';`;
        await client.query(sql);
        console.log("Fraud review decided as " + decision);
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + check + "\n\n");
    }
}

async function admin_list_all_customers() {
    const client = await getClient();
    const sql = `SELECT id, username, email, full_name, total_paid FROM customers WHERE deleted_at IS NULL;`;
    try {
        const result = await client.query(sql);
        return result.rows;
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        return [];
    }
}

async function admin_export_all_data() {
    const client = await getClient();
    const sql = `COPY (
        SELECT * FROM customers 
        UNION ALL SELECT * FROM payments 
        UNION ALL SELECT * FROM payment_methods 
        UNION ALL SELECT * FROM refunds 
        UNION ALL SELECT * FROM chargebacks 
        UNION ALL SELECT * FROM fraud_reviews
    ) TO '/tmp/legacy_full_export_${Date.now()}.csv' WITH CSV HEADER;`;
    try {
        await client.query(sql);
        console.log("Full data export completed to /tmp/legacy_full_export_*.csv");
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function search_payments(search_term: string) {
    const client = await getClient();
    const sql = `SELECT * FROM payments WHERE raw_provider_payload LIKE '%${search_term}%' OR error_message LIKE '%${search_term}%';`;
    try {
        const result = await client.query(sql);
        return result.rows;
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        return [];
    }
}

async function process_recurring_billing() {
    const client = await getClient();
    const sql = `SELECT * FROM payments WHERE status = 'captured' AND installment_count > '0';`;
    try {
        const result = await client.query(sql);
        for (const p of result.rows) {
            console.log("Recurring payment processed for " + p.id);
            await process_payment(p.customer_id, p.payment_method_id, p.amount, p.currency);
        }
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function handle_webhook(payload: string) {
    const client = await getClient();
    let raw: any = {};
    try {
        raw = JSON.parse(payload);
    } catch (_) {}
    if (raw.payment_id) {
        const sql = `UPDATE payments SET status = 'settled', settled_at = NOW()::text WHERE id = '${raw.payment_id}';`;
        try {
            await client.query(sql);
            const log_sql = `INSERT INTO payment_logs (
                id, payment_id, customer_id, log_level, message, payload, created_at,
                actor_email, source
            ) VALUES (
                'log_' || nextval('payment_logs_id_seq'::regclass),
                '${raw.payment_id}',
                '${raw.customer_id || ''}',
                'INFO',
                'Webhook received',
                '${payload.replace(/'/g, "''")}',
                NOW()::text,
                'system@legacy.com',
                'legacy_core'
            );`;
            await client.query(log_sql);
            console.log("Webhook processed");
        } catch (e: any) {
            console.error("[ERROR] " + e.message);
            fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
        }
    }
}

async function ban_customer(customer_id: string) {
    const client = await getClient();
    const sql = `UPDATE customers SET blocked_flag = 'true' WHERE id = '${customer_id}';`;
    try {
        await client.query(sql);
        console.log("Customer banned");
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

async function generate_api_key(customer_id: string) {
    const client = await getClient();
    const key = 'key_' + require('crypto').createHash('md5').update(Date.now().toString() + SITE_SECRET).digest('hex');
    const secret = 'secret_' + require('crypto').createHash('md5').update(Math.random().toString()).digest('hex');
    const sql = `UPDATE customers SET api_key = '${key}', api_secret = '${secret}' WHERE id = '${customer_id}';`;
    try {
        await client.query(sql);
        console.log("API key generated: " + key);
    } catch (e: any) {
        console.error("[ERROR] " + e.message);
        fs.appendFileSync('legacy_errors.log', new Date().toISOString() + " | " + e.message + "\nSQL: " + sql + "\n\n");
    }
}

// CLI Demo (run with: ts-node payment_system.ts or compile with tsc)
if (require.main === module) {
    console.log("LEGACY PAYMENT SYSTEM STARTED (TypeScript version)");

    (async () => {
        const cust1 = await register_customer('testuser1', 'test1@example.com', 'PlainPass123', 'Test User One', '381601234567', 'RS', 'Belgrade', 'Novi Beograd 1');
        const cust2 = await register_customer('testuser2', 'test2@example.com', 'AnotherPass456', 'Test User Two', '381609876543', 'RS', 'Novi Sad', 'Address 2');

        await login_customer('testuser1', 'PlainPass123');
        await login_customer('testuser2', 'AnotherPass456');

        const pm1 = await add_payment_method(cust1 || '', 'card', '4242424242424242', '12', '2028', '123', 'Test User One');
        const pm2 = await add_payment_method(cust2 || '', 'iban', '', '', '', '', 'Test User Two', 'RS12345678901234567890');

        const pay1 = await process_payment(cust1 || '', pm1 || '', '149.99', 'EUR', 'ORDER-1001');
        const pay2 = await process_payment(cust2 || '', pm2 || '', '299.50', 'USD', 'ORDER-1002');

        await create_refund(pay1 || '', '49.99', 'partial return');
        await process_refund('ref_' + (pay1 || '').substring(4));

        await simulate_chargeback(pay2 || '', '299.50', 'dispute');
        await resolve_chargeback('cb_' + (pay2 || '').substring(4), 'false');

        await create_fraud_review(pay1 || '', cust1 || '', '78');
        await decide_fraud_review('fraud_' + (pay1 || '').substring(4), 'approve', 'admin@legacy.com', 'AdminPass123');

        await reset_password('test1@example.com', 'NewPlainPass789');
        await verify_email('email_verify_token_demo');

        await admin_export_all_data();

        await process_recurring_billing();

        const webhook_payload = JSON.stringify({ payment_id: pay1, customer_id: cust1, status: 'settled' });
        await handle_webhook(webhook_payload);

        await generate_api_key(cust1 || '');
        await ban_customer(cust2 || '');

        console.log("LEGACY PAYMENT SYSTEM WORKFLOW COMPLETE");
    })();
}