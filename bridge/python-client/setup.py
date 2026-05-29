from setuptools import find_packages, setup

setup(
    name="agent-hub-hermes-bridge",
    version="0.1.0",
    description="Hermes Agent-Hub Bridge Plugin",
    packages=find_packages(),
    install_requires=["websocket-client>=1.8.0"],
    python_requires=">=3.10",
)
