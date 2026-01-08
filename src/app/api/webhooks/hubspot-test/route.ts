import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('=== HUBSPOT TEST WEBHOOK ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Full Body:', JSON.stringify(body, null, 2))
    console.log('===========================')

    return NextResponse.json({
      success: true,
      message: 'Test webhook received successfully',
      timestamp: new Date().toISOString(),
      body_keys: Object.keys(body),
      has_properties: !!body.properties,
      properties_count: body.properties ? Object.keys(body.properties).length : 0
    })
  } catch (error) {
    console.error('Error in test webhook:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Test webhook endpoint is active',
    timestamp: new Date().toISOString(),
  })
}
