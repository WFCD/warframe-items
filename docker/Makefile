all:

image:
	docker build -t $(registry)/warframe-items -f Dockerfile .
	docker push $(registry)/warframe-items

armhf:
	docker build -t $(registry)/warframe-items:armhf -f Dockerfile.armhf .
	docker push $(registry)/warframe-items
