import os
import stripe
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def test_stripe_config():
    print("🔍 Testing Stripe Configuration...")
    
    # Test 1: Check environment variables
    secret_key = os.getenv("STRIPE_SECRET_KEY")
    price_id = os.getenv("STRIPE_PRICE_ID")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    print(f"✅ STRIPE_SECRET_KEY: {'Set' if secret_key else '❌ Missing'}")
    print(f"✅ STRIPE_PRICE_ID: {price_id if price_id else '❌ Missing'}")
    print(f"✅ STRIPE_WEBHOOK_SECRET: {'Set' if webhook_secret else '❌ Missing'}")
    
    if not secret_key or not price_id:
        print("❌ Missing required Stripe environment variables!")
        return False
    
    try:
        # Test 2: Check if price exists in Stripe
        price = stripe.Price.retrieve(price_id)
        print(f"✅ Price found: {price.nickname or 'No nickname'} - ${price.unit_amount/100}/month")
        
        # Test 3: Test creating a customer (don't create subscription)
        test_customer = stripe.Customer.create(
            email="test@example.com",
            name="Test User"
        )
        print(f"✅ Customer creation works: {test_customer.id}")
        
        # Clean up test customer
        stripe.Customer.delete(test_customer.id)
        print("✅ Test customer deleted")
        
        print("🎉 All Stripe tests passed!")
        return True
        
    except stripe.error.InvalidRequestError as e:
        print(f"❌ Stripe API Error: {e}")
        return False
    except Exception as e:
        print(f"❌ General Error: {e}")
        return False

if __name__ == "__main__":
    test_stripe_config() 