import os.path
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import gradio as gr
import pandas as pd

def authenticate_with_google_sheets():
    creds = None
    token_path = 'token.pickle'
    
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', ['https://www.googleapis.com/auth/spreadsheets.readonly'])
            creds = flow.run_local_server(port=0)
        
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
    
    return creds

def get_data(sheet_range):
    sheet_id = '1ACpGIUQ_EA42Ym_yDxNpb81DWHLXSTX1jHzq7cnNxdI'
    creds = authenticate_with_google_sheets()
    
    service = build('sheets', 'v4', credentials=creds)
    
    result = service.spreadsheets().values().get(spreadsheetId=sheet_id, range=sheet_range).execute()
    data = result.get('values', [])
    
    if not data:
        data = []
    
    return data

def main():
    clients_sheet_range = 'Clients!A1:H1000'  # Adjust the range as needed
    therapists_sheet_range = 'Therapists!A1:H1000'  # Adjust the range as needed

    def wrapper(sheet_name):
        if sheet_name.lower() == 'clients':
            data = get_data(clients_sheet_range)
        elif sheet_name.lower() == 'therapists':
            data = get_data(therapists_sheet_range)
        else:
            return pd.DataFrame(columns=['Error'], data=[["Invalid sheet name."]])

        if data:
            headers = data.pop(0)
            df = pd.DataFrame(data, columns=headers)
            return df
        else:
            return pd.DataFrame(columns=['Error'], data=[["No data found in the specified range."]])

    iface = gr.Interface(
        fn=wrapper,
        inputs=["text"],
        outputs="dataframe",
        title="Questionnaire Data",
        description="Enter the sheet name (either 'Clients' or 'Therapists') to retrieve data from the specified Google Sheet.",
        examples=[["Clients"], ["Therapists"]],
        allow_flagging="never"
        )

    iface.launch()

main()
