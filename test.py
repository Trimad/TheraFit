import os.path
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import gradio as gr
import pandas as pd
import numpy as np

clients_sheet_range = 'Clients!A1:I1000'
therapists_sheet_range = 'Therapists!A1:I1000'


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

    # Print the loaded data to the console
    # print(f"Data loaded from sheet_range '{sheet_range}':")
    # for row in data:
    #     print(row)

    return data


def euclidean_distance(vector1, vector2):
    return np.sqrt(np.sum((np.array(vector1) - np.array(vector2))**2))

therapists_data = pd.DataFrame(get_data(therapists_sheet_range), columns=['Timestamp', 'UID', 'Name', 'Comfort_Stress', 'Comfort_Anxiety', 'Comfort_SelfConfidence', 'Comfort_Relationships', 'Comfort_Depression', 'Vector']).drop(0)
clients_data = pd.DataFrame(get_data(clients_sheet_range), columns=['Timestamp', 'UID', 'Name', 'Stress', 'Anxiety', 'SelfConfidence', 'Relationships', 'Depression', 'Vector']).drop(0)

def find_therapists(input_uid):
    therapists_data = pd.DataFrame(get_data(therapists_sheet_range), columns=['Timestamp', 'UID', 'Name', 'Comfort_Stress', 'Comfort_Anxiety', 'Comfort_SelfConfidence', 'Comfort_Relationships', 'Comfort_Depression', 'Vector']).drop(0)
    clients_data = pd.DataFrame(get_data(clients_sheet_range), columns=['Timestamp', 'UID', 'Name', 'Stress', 'Anxiety', 'SelfConfidence', 'Relationships', 'Depression', 'Vector']).drop(0)

    print(f"find_therapists input: '{input_uid}'")
    
    input_uid = str(int(input_uid))

    selected_client_vector = None
    for _, row in clients_data.iterrows():
        if row['UID'] == input_uid:
            vector_values = row['Vector'].split(',')
            selected_client_vector = [float(x) for x in vector_values if x.strip()]
            break
    print(f"selected_client_vector: '{selected_client_vector}'")

    closest_therapists = find_closest_therapists(selected_client_vector, therapists_data)
    print(f"closest_therapists: '{closest_therapists}'")

    result = "Therapists sorted by their Euclidean distance (closest to farthest):\n\n"
    for idx, therapist in enumerate(closest_therapists, start=1):
        therapist_vector_values = therapist['Vector'].split(',')
        therapist_vector = [float(x) for x in therapist_vector_values if x.strip()]
        result += f"{idx}. {therapist['Name']} (UID: {therapist['UID']}, Distance: {euclidean_distance(selected_client_vector, therapist_vector):.2f})\n"

    return result

def find_closest_therapists(selected_client_vector, therapists_data):
    if selected_client_vector is None:
        return []

    therapists_distances = []
    for _, row in therapists_data.iterrows():
        vector_values = row['Vector'].split(',')
        print(f"vector_values: '{vector_values}'")
        therapist_vector = [float(x) for x in vector_values if x.strip()]
        distance = euclidean_distance(selected_client_vector, therapist_vector)
        therapists_distances.append((row, distance))

    sorted_therapists = sorted(therapists_distances, key=lambda x: x[1])
    #return [therapist[0] for therapist in sorted_therapists[:5]]  # Return only the top 5 closest therapists
    return [therapist[0] for therapist in sorted_therapists]  # Return only the top 5 closest therapists

iface = gr.Interface(fn=find_therapists, inputs=["text"], outputs="text", allow_flagging=True)

iface.launch(share=False, server_port=7861)
