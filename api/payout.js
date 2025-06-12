const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { address, score, payout, currency, timestamp } = req.body;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || !Number.isInteger(score) || score < 0 || !currency || currency !== 'BMN') {
        return res.status(400).json({ message: 'Invalid request' });
    }

    try {
        const { error } = await supabase
            .from('payouts')
            .insert([{ address, score, payout, currency, timestamp }]);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ message: 'Failed to submit payout' });
        }

        return res.status(200).json({ message: 'Payout request submitted!' });
    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};