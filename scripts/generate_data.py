import json
import os
import sys

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.tasks import TicketGenerator

def main():
    print("🚀 Generating 1000 Support Tickets...")
    generator = TicketGenerator()
    dataset = []
    
    for i in range(1000):
        difficulty = "easy" if i < 300 else "medium" if i < 700 else "hard"
        ticket = generator.generate_random_ticket(difficulty)
        dataset.append(ticket)
        
    os.makedirs("data", exist_ok=True)
    with open("data/support_tickets_1000.json", "w") as f:
        json.dump(dataset, f, indent=2)
        
    print(f"✅ Success! 1000 tickets saved to data/support_tickets_1000.json")

if __name__ == "__main__":
    main()
