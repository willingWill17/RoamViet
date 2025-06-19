from pydantic import BaseModel, Field
from typing import List, Optional
# from dataclass.destination import Destination

class DayDetail(BaseModel):
    name: str
    description: str
    estimated_duration: Optional[str] = None
    time_phase: str
    time_range: str

class Days(BaseModel):
    day_number: int
    date: str  
    destinations: List[DayDetail] = []

class Schedule(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: str  
    end_date: str  
    budget: Optional[float] = None
    currency: str = "VND"
    shared_emails: List[str] = []
    tags: List[str] = []
    days: List[Days]
    