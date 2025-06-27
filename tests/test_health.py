async def test_check_health(async_client):
    # act
    response = await async_client.get("/api/health/")

    # assert
    assert response.status_code == 200
