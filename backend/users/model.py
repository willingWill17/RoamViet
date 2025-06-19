import bcrypt
import aiomysql

def register(email: str, username: str, pwd: str):
    
    hashed_pw = bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()
    async with app.state.pool.acquire() as conn:
        async with conn.cursor() as cur:
            try:
                await cur.execute(
                    "INSERT INTO users (email, username, password) VALUES (%s, %s)",
                    (username, hashed_pw)
                )
                await conn.commit()
                return {"message": "User registered successfully"}
            except aiomysql.IntegrityError:
                raise HTTPException(status_code=400, detail="Username already exists")
