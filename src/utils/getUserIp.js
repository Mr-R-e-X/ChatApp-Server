import os from "os";

const networkInterfaces = os.networkInterfaces();

export const getUserIpAddress = () => {
  for (const interfaceName in networkInterfaces) {
    for (const interfac of networkInterfaces[interfaceName]) {
      if (interfac.family === "IPv4" && !interfac.internal) {
        console.log("Your local IP address is:", interfac.address);
        return interfac.address;
      }
    }
  }
  return null;
};
