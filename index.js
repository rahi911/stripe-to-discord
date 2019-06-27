require('dotenv').config()

// add discord webhook function
const webhook = require("webhook-discord");

// Set your secret key: remember to change this to your live secret key in production
// See your keys here: https://dashboard.stripe.com/account/apikeys
const stripe = require('stripe')(process.env.API_KEY);

// Find your endpoint's secret in your Dashboard's webhook settings
const endpointSecret = process.env.ENDPOINT_SECRET;

// This example uses Express to receive webhooks
const app = require('express')();

// Use body-parser to retrieve the raw body as a buffer
const bodyParser = require('body-parser');

app.get("/", (request, response) => {
    response.status(200).json({ response: true, "description": "stripe to discord by @darroneggins" });
});

app.get("/test", (request, response) => {
    const testHook = new webhook.Webhook(process.env.PAYMENT_HOOK);

    let paymentIntent = { amount: "10000", "currency": "usd" }

    const testMsg = new webhook.MessageBuilder()
        .setName("Stripe Payment")
        .setColor("#32CD32")
        .addField("Payment From", `Darron Eggins`, true)
        .addField("Payment Amount", `$${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`, true)
        .setImage("https://stripe.com/img/v3/home/twitter.png")
        .setTime();

    testHook.send(testMsg);

    response.status(200).json({ success: true });
});

// Match the raw body to content type application/json
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    }
    catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'charge.succeeded':
            const paymentIntent = event.data.object;

            const chargeSucceededHook = new webhook.Webhook(process.env.PAYMENT_HOOK);

            const msg = new webhook.MessageBuilder()
                .setName("Stripe Payment")
                .setColor("#32CD32")
                .addField("Payment From", `${paymentIntent.billing_details.name}`)
                .addField("Payment Amount", `$${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`)
                .setTime();

            chargeSucceededHook.send(msg);


            return response.status(200).send(paymentIntent);

        case 'charge.failed':
            const paymentIntentFailed = event.data.object;

            const chargeFailedHook = new webhook.Webhook(process.env.PAYMENT_HOOK);

            const msgFailed = new webhook.MessageBuilder()
                .setName("Stripe Payment Failed")
                .setColor("#FF0000")
                .addField("Payment From", `${paymentIntent.billing_details.name}`)
                .addField("Payment Amount", `$${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`)
                .setTime();

            chargeFailedHook.send(msgFailed);


            return response.status(200).send(paymentIntentFailed);
        default:
            // Unexpected event type
            return response.status(400).end();
    }

    // Return a response to acknowledge receipt of the event
    response.json({ received: true });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Express Server is now running on port ${port}`);
});