import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.database import Base
from core.dependencies import get_db
from main import app

SQLALCHEMY_TEST_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def owner_token(client):
    """Create an owner user and return auth headers."""
    from core.security import create_access_token, hash_password
    from models.user import User, UserRole

    db_session = TestingSessionLocal()
    user = User(
        name="Test Owner",
        email="owner@test.com",
        password_hash=hash_password("password"),
        role=UserRole.owner,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    db_session.close()

    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}
