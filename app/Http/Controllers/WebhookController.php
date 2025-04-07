<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function handle(Request $request)
    {
        // Log semua data yang diterima untuk melihat formatnya
        Log::info('Webhook Payload:', ['data' => $request->all()]);

        // Jika request berbentuk JSON
        $payload = $request->json()->all();

        // Jika request memiliki header tertentu, bisa dicek seperti ini:
        $headers = $request->headers->all();

        return response()->json(['message' => 'Webhook received successfully']);
    }
}
