# 

k-bucket, k-rpc, k-rpc-socket 통합 버전
(합친이유: 너무 작은 조각들이 흩어져 있어봤자 코드 돌아다니는 비용이 더 든다.)

k-bucket과 k-rpc-socket의 기능은 충분히 필요하다. 그런데 k-rpc의 기능은 너무 작다. 부트스트랩과 피어찾기 함수외 코드는 그다지 의미가 없어보인다. 

announce -> bootstrap(find_node)

find metadata 루프를 찾아라

try to find more peers 루프를 찾아라



