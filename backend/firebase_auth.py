import os
import requests
from dotenv import load_dotenv

load_dotenv()

FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
if not FIREBASE_API_KEY:
    raise ValueError("FIREBASE_API_KEY environment variable is not set")

def create_user(email, password, username=None):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_API_KEY}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            return {
                "message": "User registered successfully", 
                "success": True,
                "idToken": data.get("idToken"),
                "refreshToken": data.get("refreshToken"),
                "expiresIn": data.get("expiresIn"),
                "localId": data.get("localId"),
                "email": data.get("email")
            }
        else:
            error_data = response.json()
            return {
                "message": error_data.get("error", {}).get("message", "Unknown error"), 
                "success": False
            }
    except requests.RequestException as e:
        return {"message": f"Network error: {str(e)}", "success": False}

def login_user(email, password):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            return {
                "message": "Login successful",
                "success": True,
                "idToken": data.get("idToken"),
                "refreshToken": data.get("refreshToken"),
                "expiresIn": data.get("expiresIn"),
                "localId": data.get("localId"),
                "email": data.get("email")
            }
        else:
            error_data = response.json()
            return {
                "message": error_data.get("error", {}).get("message", "Unknown error"), 
                "success": False
            }
    except requests.RequestException as e:
        return {"message": f"Network error: {str(e)}", "success": False}

def verify_token(id_token):
    """Verify Firebase ID token"""
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}"
    payload = {"idToken": id_token}
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            users = response.json().get("users", [])
            if users:
                return {
                    "message": "Token verified", 
                    "success": True, 
                    "user": users[0]
                }
            else:
                return {"message": "No user found", "success": False}
        else:
            return {"message": "Invalid token", "success": False}
    except requests.RequestException as e:
        return {"message": f"Network error: {str(e)}", "success": False}

def verify_google_token(id_token):
    """Legacy function - use verify_token instead"""
    return verify_token(id_token)

def refresh_token(refresh_token):
    """Refresh an expired ID token"""
    url = f"https://securetoken.googleapis.com/v1/token?key={FIREBASE_API_KEY}"
    payload = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            return {
                "message": "Token refreshed successfully",
                "success": True,
                "idToken": data.get("id_token"),
                "refreshToken": data.get("refresh_token"),
                "expiresIn": data.get("expires_in")
            }
        else:
            return {"message": "Failed to refresh token", "success": False}
    except requests.RequestException as e:
        return {"message": f"Network error: {str(e)}", "success": False}

def send_password_reset_email(email):
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={FIREBASE_API_KEY}"
    payload = {
        "requestType": "PASSWORD_RESET",
        "email": email
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            return {
                "message": "Password reset email sent successfully.",
                "success": True
            }
        else:
            error_data = response.json()
            return {
                "message": error_data.get("error", {}).get("message", "Unknown error"),
                "success": False
            }
    except requests.RequestException as e:
        return {"message": f"Network error: {str(e)}", "success": False}
