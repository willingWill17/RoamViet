from pydantic import BaseModel

class UserAccount(BaseModel):
    email: str
    username: str
    password: str
    
