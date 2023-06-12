# vizer-hub

`vizer-hub` is a NodeJS/express web server that is intended to be used as an
example landing page for deploying [`vizer`](https://github.com/utkarshayachit/vizer)
on Azure with Azure Batch. The codebase shows how to use Azure SDK to trigger jobs/tasks
in on a Azure deployment with an Azure Batch account. One can create such a deployment
using the [`azbatch-starter`](https://github.com/utkarshayachit/azbatch-starter) accelerator.

## Installation

To install and run the server, clone this repository and then do the following
from within the repository directory:

```bash
# install dependencies
> npm install

# verify installation
> node app.cjs --help

# output:
Usage: vizer-hub [options]

vizer-hub: landing page for vizer on Azure Batch

Options:
  -V, --version                            output the version number
  -p,--port <number>                       webserver port number (default: 8000)
  -i,--managed-identity-client-id <id>     user managed identity client id
  -s,--storage-account <name>              storage account name
  -c,--storage-container <name>            storage container name (default: "datasets")
  -k,--storage-account-key <key>           storage account key for Shared Key authentication
  -x,--storage-connection-string <string>  storage account connection string
  -t,--storage-sas-token <token>           storage account SAS token ot use SAS authentication
  -b,--batch-endpoint <url>                batch account endpoint (required)
  -e,--batch-account-key <key>             batch account access key for Shared Key authentication
  -n,--batch-pool-id <id>                  batch account pool id (default: "linux")
  -r,--batch-mount-path <path>             batch account mount relative path, if not specified storage container name will be used
  -a,--container-image <name>              container app image name (default: "docker.io/utkarshayachit/vizer:osmesa-main")
  -h, --help                               display help for command
```

## Usage

The `app.js` script is the main entry point for the `vizer-hub` web-server. `vizer-hub` is designed to
list the contents of an Azure Blob Storage container and present them to the user. The user can select one (or several)
datasets from the list and submit a job to visualize them using `vizer`. The app does the job submission by connecting
to an Azure Batch account and submitting a job. Once the job has started, the app will redirect the user to a page
that lets users directly interact with the `vizer` application running on a compute node in the Azure Batch pool.

Details about the Azure resources to connect to are provided to the app using command line arguments. For storage account,
one can specify a SAS token (`--storage-sas-token`) or a connection string (`--storage-connection-string`) or a storage account
key (`--storage-account-key`). For Azure Batch, one can specify a Batch account key (`--batch-account-key`) may be specified.
When running on an Azure VM (or service), one can also specify a managed identity client id (`--managed-identity-client-id`)
and the app will use that to authenticate with Azure Batch and Azure Storage as fallback if none of the other authentication
options are specified for Batch and Storage.

### Command Line Arguments

| Argument | Description |
| -------- | ----------- |
| `-p`, `--port` | [**default**: `8000`] Port number to use for the web server. |
| `-i`, `--managed-identity-client-id` | User managed identity client id. When running on an Azure VM or App Service, <br/> you can use this argument to pass the Managed Identity Client ID to vizer-hub.<br/> The identity will then be used for signing into batch account or storage account <br/> if any of the other arguments to pass keys/tokens for these services are not provided.|
| **Storage Account Details** | |
| `-s`, `--storage-account` | **[required]** Name of the storage account to use.|
| `-c`, `--storage-container` | [**default**: `datasets`] Name of the storage container to use. vizer-hub will list the contents of this container. |
| `-k`, `--storage-account-key` | Storage account key for Shared Key authentication. When specified this key <br/> will be used to authenticate with the storage account.|
| `-x`, `--storage-connection-string` | Storage account connection string. When specified this connection string <br/> will be used to authenticate with the storage account.|
| `-t`, `--storage-sas-token` | Storage account SAS token. When specified this SAS token <br/> will be used to authenticate with the storage account.|
| **Batch Account Details** | |
| `-b`, `--batch-endpoint` | **[required]** Batch account endpoint. <br/> This must be in the form `https://<batch-account-name>.<region>.batch.azure.com`|
| `-e`, `--batch-account-key` | Batch account key for Shared Key authentication. When specified this key <br/> will be used to authenticate with the batch account.|
| `-n`, `--batch-pool-id` | [**default**: `linux`] Batch account pool id. <br/> This is the pool that will be used to run the vizer jobs on.|
| `-r`, `--batch-mount-path` | Batch account mount relative path. <br/> This is the path relative to the pool's mount path where the storage container <br/> will be mounted. If not specified, the storage container name will be used. |
| **vizer Container Details** | |
| `-a`, `--container-image` | [**default**: `docker.io/utkarshayachit/vizer:osmesa-main`]<br/> Container app image name. This is the container image that will be used to run the vizer jobs. <br/> The image must be available in a container registry that the batch account can access. |

## Docker

[![container-image](https://github.com/utkarshayachit/vizer-hub/actions/workflows/container-image.yml/badge.svg)](https://github.com/utkarshayachit/vizer-hub/actions/workflows/container-image.yml)

The `Dockerfile` in this repository can be used to build a docker image for `vizer-hub`. The image can be built using the
following command:

```bash
# build docker image
> docker build -t vizer-hub .

# run docker image
> docker run -it --rm -p 8000:8000 vizer-hub --batch-endpoint <batch-endpoint> --batch-account-key <batch-account-key> \
    --storage-account <storage-account> --storage-account-key <storage-account-key> --storage-container <storage-container>
```

Prebuilt container images are also available on [Docker Hub](https://hub.docker.com/r/utkarshayachit/vizer-hub).
You can directly use these using the following command:

```bash
# run using prebuilt docker image
> docker run -it --rm -p 8000:8000 utkarshayachit/vizer-hub:main [...]
```

## License

Copyright (c) Microsoft Corporation. All rights reserved.

This project is licensed under the terms of the [MIT license](./LICENSE).
