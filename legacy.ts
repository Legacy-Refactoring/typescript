function register_customer(username: string, email: string, password: string, full_name: string, phone: string = '', country: string = 'RS', city: string = '', address: string = '') {}
function login_customer(username: string, password: string) {}
function get_customer(customer_id: string) {}
function update_customer_profile(customer_id: string, new_email: string, new_phone: string, new_address: string) {}
function reset_password(email: string, new_password: string) {}
function verify_email(token: string) {}
function add_payment_method(customer_id: string, type: string, card_number: string, expiry_month: string, expiry_year: string, cvv: string, holder_name: string, iban: string = '') {}
function list_payment_methods(customer_id: string) {}
function delete_payment_method(pm_id: string) {}
function process_payment(customer_id: string, payment_method_id: string, amount: string, currency: string = 'EUR', external_order_id: string | null = null, ip: string | null = null) {}
function list_payments(customer_id: string) {}
function get_payment_details(payment_id: string) {}
function create_refund(payment_id: string, amount: string, reason: string = 'customer request') {}
function process_refund(refund_id: string) {}
function simulate_chargeback(payment_id: string, amount: string, reason: string = 'fraud') {}
function resolve_chargeback(chargeback_id: string, won: string = 'true') {}
function create_fraud_review(payment_id: string, customer_id: string, score: string = '85') {}
function decide_fraud_review(review_id: string, decision: string, reviewer_email: string, reviewer_password: string) {}
function admin_list_all_customers() {}
function admin_export_all_data() {}
function search_payments(search_term: string) {}
function process_recurring_billing() {}
function handle_webhook(payload: string) {}
function ban_customer(customer_id: string) {}
function generate_api_key(customer_id: string) {}
