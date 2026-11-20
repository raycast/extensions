import { environment } from "@raycast/api";
import { Repository } from "./storage";
import { BriefingService } from "./service";

export const repository = new Repository(environment.supportPath);
export const service = new BriefingService(repository);
