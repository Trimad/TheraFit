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

def create_vector(row_data):
    vector = row_data[3:8]
    vector = [float(x) for x in vector]
    return vector


def data_to_dataframe(data):
    if data:
        headers = data.pop(0)
        df = pd.DataFrame(data, columns=headers)
        df["Vector"] = df.apply(create_vector, axis=1)
    else:
        df = pd.DataFrame(columns=['Error'], data=[["No data found in the specified range."]])
    return df


def display_side_by_side(*args):
    html_str = ''
    for df in args:
        html_str += df.to_html(index=False, classes="table table-striped")
    return html_str

def main():
    clients_sheet_range = 'Clients!A1:H1000'  # Adjust the range as needed
    therapists_sheet_range = 'Therapists!A1:H1000'  # Adjust the range as needed

    def wrapper():
        clients_data = get_data(clients_sheet_range)
        therapists_data = get_data(therapists_sheet_range)

        clients_df = data_to_dataframe(clients_data)
        therapists_df = data_to_dataframe(therapists_data)
        
        return display_side_by_side(clients_df, therapists_df)

    iface = gr.Interface(
        fn=wrapper,
        inputs=[],
        outputs="html",
        title="Clients and Therapists Data",
        description="This interface displays Clients and Therapists data from the specified Google Sheet in two separate tables side-by-side.",
        allow_flagging="never"
    )
    iface.launch()

if __name__ == '__main__':
    main()
