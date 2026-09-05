import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();

    // Store subscription in database
    // In production, associate with user ID from auth token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Save subscription to database
    // await prisma.pushSubscription.create({
    //   data: {
    //     userId: decodedToken.userId,
    //     endpoint: subscription.endpoint,
    //     keys: subscription.keys,
    //   },
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    // TODO: Remove subscription from database
    // await prisma.pushSubscription.deleteMany({
    //   where: { endpoint },
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
