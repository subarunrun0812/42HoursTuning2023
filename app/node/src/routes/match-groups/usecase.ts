import { v4 as uuidv4 } from "uuid";
import {
  MatchGroupDetail,
  MatchGroupConfig,
  UserForFilter,
} from "../../model/types";
import {
  getMatchGroupDetailByMatchGroupId,
  getUserIdsBeforeMatched,
  hasSkillNameRecord,
  insertMatchGroup,
} from "./repository";
import { getUserForFilter, getUsersWithFilter, convertIdToValue, judgeUsers } from "../users/repository";

export const checkSkillsRegistered = async (
  skillNames: string[]
): Promise<string | undefined> => {
  for (const skillName of skillNames) {
    if (!(await hasSkillNameRecord(skillName))) {
      return skillName;
    }
  }

  return;
};

export const createMatchGroup = async (
  matchGroupConfig: MatchGroupConfig,
  timeout?: number
): Promise<MatchGroupDetail | undefined> => {
  const owner = await getUserForFilter(matchGroupConfig.ownerId);
  let members: UserForFilter[] = [owner];
  const filterMembers = await getUsersWithFilter();
  const startTime = Date.now();
  while (members.length < matchGroupConfig.numOfMembers) {
    // デフォルトは50秒でタイムアウト
    if (Date.now() - startTime > (!timeout ? 50000 : timeout) || filterMembers.length === 0) {
      console.error("not all members found before timeout");
      return;
    }
    const random = Math.floor(Math.random() * filterMembers.length);
    const candidate = filterMembers.splice(random, random)[0];
    if (owner.userId === candidate.user_id) {
      console.log(`${candidate.user_id} is already added to members`);
      continue;
    }
    if (await judgeUsers(candidate, owner, matchGroupConfig))
        continue;
    if (
      matchGroupConfig.neverMatchedFilter &&
      !(await isPassedMatchFilter(matchGroupConfig.ownerId, candidate.user_id))
    ) {
      console.log(`${candidate.user_id} is not passed never matched filter`);
      continue;
    }
    if (await !judgeUsers(candidate, owner, matchGroupConfig))
      continue;
  /*
const tmp: User = {
userId: String = candidate.user_id,
userIcon: {fileId: "", fileName: ""},
userName: "",
officeName: ""
}*/
    members.push(await convertIdToValue(candidate));
    console.log(`${candidate.userId} is added to members`);
  }

  const matchGroupId = uuidv4();
  await insertMatchGroup({
  matchGroupId,
  matchGroupName: matchGroupConfig.matchGroupName,
  description: matchGroupConfig.description,
  members,
  status: "open",
  createdBy: matchGroupConfig.ownerId,
  createdAt: new Date(),
  });

  return await getMatchGroupDetailByMatchGroupId(matchGroupId);
};

const isPassedMatchFilter = async (ownerId: string, candidateId: string) => {
  const userIdsBeforeMatched = await getUserIdsBeforeMatched(ownerId);
  return userIdsBeforeMatched.every(
    (userIdBeforeMatched) => userIdBeforeMatched !== candidateId
  );
};
