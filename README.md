[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![ExpressJS](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)

## About

CVExchange is a Reddit-inspired content discussion and exchange platform built for the "International Information Security Contest" at TU Berlin.
For more detailed information about the service and its vulnerabilities, please refer to the [documentation](documentation/README.md).

## Getting Started

### Prerequisites

- Download and install the latest version of [docker](https://docs.docker.com/get-docker/).
- Download and install the latest versions of [python](https://www.python.org/downloads/) and [pip](https://pypi.org/project/pip/).
- Install [enochecker_test](https://pypi.org/project/enochecker-test/) via the following command:

  ```bash
  pip install --user enochecker_test
  ```

### Setup

1. Clone the service to your local machine as follows:
   ```bash
   git clone https://github.com/enowars/enowars7-service-CVExchange.git
   ```
2. Navigate to the service directory.

   ```bash
   cd ./service
   ```
   
3. Build and start the docker containers.
   
   ```bash
   docker compose up --build --force-recreate -d
   ```

4. The service is now running and can be accessed via [http://localhost:1337](http://localhost:1337).


### Testing

If you want to test the service with the provided checker implementation, follow these steps:

1. Navigate to the checker directory.

   ```bash
   cd ./checker
   ```

2. Build and start the docker containers.
   
   ```bash
   docker compose up --build --force-recreate -d
   ```

3. Run **enochecker_test**.

   ```bash
   enochecker_test -a localhost -p 7331 -A host.docker.internal
   ```


---

> GitHub [@Ashiven](https://github.com/Ashiven) &nbsp;&middot;&nbsp;
> Twitter [ashiven_](https://twitter.com/ashiven_)
