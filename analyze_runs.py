import json
def analyze():
    try:
        with open('latest_runs_raw.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        runs = data.get('workflow_runs', [])
        for run in runs:
            print(f"{run['created_at']} | {run['event']} | {run['conclusion']} | {run['display_title']}")
    except Exception as e:
        print(f"Error: {e}")
analyze()
