import os

def read_log():
    log_path = 'scraper_log_authed.txt'
    if not os.path.exists(log_path):
        print("Log file not found.")
        return
    
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
        
    start_found = False
    for i, line in enumerate(lines):
        if "Scraping:" in line:
            start_found = True
            print("--- Found Scraping Start ---")
            # Print the next 50 lines from the first occurrence
            for j in range(i, min(i + 100, len(lines))):
                print(lines[j].strip())
            break
            
    if not start_found:
        print("Keyword 'Scraping:' not found in log.")
        # Print first 20 lines to see what's there
        print("--- First 20 lines ---")
        for line in lines[:20]:
            print(line.strip())

if __name__ == "__main__":
    read_log()
