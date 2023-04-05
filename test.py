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

def generate_html_table(df):
    table_html = "<table border='1'>"
    table_html += "<tr>"
    for col in df.columns:
        table_html += f"<th>{col}</th>"
    table_html += "</tr>"

    for i, row in df.iterrows():
        table_html += "<tr onmouseover='this.style.backgroundColor=\"#ff3333\"' onmouseout='this.style.backgroundColor=\"\"' onclick='rowClicked({i})'>"
        for value in row.values:
            table_html += f"<td>{value}</td>"
        table_html += "</tr>"

    table_html += "</table>"
    return table_html

clients_sheet_range = 'Clients!A1:H1000'
therapists_sheet_range = 'Therapists!A1:H1000'

def get_data_display(sheet_range):
    data = get_data(sheet_range)
    df = data_to_dataframe(data)
    table_html = generate_html_table(df)
    custom_html = "<br><p>This is custom HTML.</p>"
    html = table_html + custom_html
    return html

clients_demo = gr.Interface(
    fn=lambda: get_data_display(clients_sheet_range),
    inputs=[],
    outputs="html",
    title="TheraFit",
    description="This interface displays Clients data from the specified Google Sheet in a table.",
    allow_flagging="never",
)

therapists_demo = gr.Interface(
    fn=lambda: get_data_display(therapists_sheet_range),
    inputs=[],
    outputs="html",
    title="TheraFit",
    description="This interface displays Therapists data from the specified Google Sheet in a table.",
    allow_flagging="never",
)

demo = gr.TabbedInterface([clients_demo, therapists_demo], ["Clients", "Therapists"])

demo.launch(server_port=7861)